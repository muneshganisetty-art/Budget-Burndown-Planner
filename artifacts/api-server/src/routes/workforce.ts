import { Router, type IRouter } from "express";
import {
  CreateBudgetBody,
  CreateBudgetResponse,
  CreateEmployeeBody,
  CreateEmployeeResponse,
  DeleteBudgetParams,
  DeleteEmployeeParams,
  GetDashboardQueryParams,
  GetDashboardResponse,
  ListBudgetsResponse,
  ListEmployeesResponse,
  UpdateBudgetBody,
  UpdateBudgetParams,
  UpdateBudgetResponse,
  UpdateEmployeeBody,
  UpdateEmployeeParams,
  UpdateEmployeeResponse,
} from "@workspace/api-zod";
import {
  budgetWorkbook,
  WorkbookConflictError,
  WorkbookNotFoundError,
  WorkbookValidationError,
  type EmployeeRecord,
} from "../lib/budgetWorkbook";

const router: IRouter = Router();
const HOURS_PER_YEAR = 40 * 52;
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function daysInYear(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
}

function dateValue(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function overlapDays(
  employee: EmployeeRecord,
  from: number,
  through: number,
): number {
  const start = Math.max(dateValue(employee.employmentBeginDate), from);
  const end = Math.min(dateValue(employee.employmentEndDate), through);
  return Math.max(0, Math.floor((end - start) / 86_400_000) + 1);
}

function accruedPayrollThrough(
  employees: EmployeeRecord[],
  year: number,
  through: number,
): number {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1) - 86_400_000;
  const cap = Math.min(through, yearEnd);
  if (cap < yearStart) return 0;
  const denominator = daysInYear(year);
  return employees.reduce(
    (sum, employee) =>
      sum +
      (employee.hourlyRate * HOURS_PER_YEAR * overlapDays(employee, yearStart, cap)) /
        denominator,
    0,
  );
}

function dashboardFor(
  year: number,
  employees: EmployeeRecord[],
  budgets: Awaited<ReturnType<typeof budgetWorkbook.listBudgets>>,
): unknown {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1) - 86_400_000;
  const yearDays = daysInYear(year);
  const yearBudget = budgets.filter((entry) => entry.year === year);
  const annualBudget = yearBudget.reduce((sum, entry) => sum + entry.amount, 0);
  const projectedPayroll = employees.reduce(
    (sum, employee) =>
      sum +
      (employee.hourlyRate *
        HOURS_PER_YEAR *
        overlapDays(employee, yearStart, yearEnd)) /
        yearDays,
    0,
  );
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const accruedPayroll = accruedPayrollThrough(employees, year, todayUtc);
  const monthlyProjection = monthLabels.map((label, index) => {
    const monthEnd = Date.UTC(year, index + 1, 0);
    const actualThrough = Math.min(monthEnd, todayUtc);
    return {
      month: index + 1,
      label,
      projectedSpend: accruedPayrollThrough(employees, year, monthEnd),
      accruedSpend: accruedPayrollThrough(employees, year, actualThrough),
      budget: annualBudget,
    };
  });
  return {
    year,
    annualBudget,
    projectedPayroll,
    accruedPayroll,
    projectedBalance: annualBudget - projectedPayroll,
    burnRate:
      annualBudget > 0
        ? (accruedPayroll / annualBudget) * 100
        : accruedPayroll > 0
          ? 100
          : 0,
    employeeCount: employees.filter(
      (employee) =>
        overlapDays(employee, yearStart, yearEnd) > 0,
    ).length,
    budgetEntries: yearBudget,
    monthlyProjection,
    calculationNote:
      "Projection uses hourly rate × 2,080 hours per year, prorated by active calendar days in the selected year. Accrued spend is an estimate using the same daily rate through today.",
  };
}

function employeeJson<T extends { employmentBeginDate: Date; employmentEndDate: Date }>(
  employee: T,
): Omit<T, "employmentBeginDate" | "employmentEndDate"> & {
  employmentBeginDate: string;
  employmentEndDate: string;
} {
  return {
    ...employee,
    employmentBeginDate: employee.employmentBeginDate.toISOString().slice(0, 10),
    employmentEndDate: employee.employmentEndDate.toISOString().slice(0, 10),
  };
}

function sendError(
  res: Parameters<Parameters<IRouter["get"]>[1]>[1],
  error: unknown,
): void {
  if (error instanceof WorkbookNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof WorkbookConflictError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof WorkbookValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "The workbook operation failed." });
}

router.get("/employees", async (_req, res): Promise<void> => {
  const employees = ListEmployeesResponse.parse(
    await budgetWorkbook.listEmployees(),
  );
  res.json(employees.map(employeeJson));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const employee = await budgetWorkbook.createEmployee(parsed.data);
    res.status(201).json(employeeJson(CreateEmployeeResponse.parse(employee)));
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/employees/:employeeId", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  const body = UpdateEmployeeBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const employee = await budgetWorkbook.updateEmployee(
      params.data.employeeId,
      body.data,
    );
    res.json(employeeJson(UpdateEmployeeResponse.parse(employee)));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/employees/:employeeId", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    await budgetWorkbook.deleteEmployee(params.data.employeeId);
    res.sendStatus(204);
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/budgets", async (_req, res): Promise<void> => {
  const budgets = await budgetWorkbook.listBudgets();
  res.json(ListBudgetsResponse.parse(budgets));
});

router.post("/budgets", async (req, res): Promise<void> => {
  const parsed = CreateBudgetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const budget = await budgetWorkbook.createBudget(parsed.data);
    res.status(201).json(CreateBudgetResponse.parse(budget));
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/budgets/:budgetId", async (req, res): Promise<void> => {
  const params = UpdateBudgetParams.safeParse(req.params);
  const body = UpdateBudgetBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const budget = await budgetWorkbook.updateBudget(
      params.data.budgetId,
      body.data,
    );
    res.json(UpdateBudgetResponse.parse(budget));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/budgets/:budgetId", async (req, res): Promise<void> => {
  const params = DeleteBudgetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    await budgetWorkbook.deleteBudget(params.data.budgetId);
    res.sendStatus(204);
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const parsed = GetDashboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { employees, budgets } = await budgetWorkbook.getAnnualData();
  const dashboard = dashboardFor(parsed.data.year, employees, budgets);
  res.json(GetDashboardResponse.parse(dashboard));
});

export default router;
