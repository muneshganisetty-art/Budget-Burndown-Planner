import ExcelJS from "exceljs";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_EMPLOYMENT_END_DATE = "9999-12-31";

export type EmployeeType = "FTE" | "CNE";

export type EmployeeRecord = {
  employeeId: string;
  employeeName: string;
  employeeType: EmployeeType;
  hourlyRate: number;
  employmentBeginDate: string;
  employmentEndDate: string;
};

export type EmployeeInput = Omit<
  EmployeeRecord,
  "employmentBeginDate" | "employmentEndDate"
> & {
  employmentBeginDate: string | Date;
  employmentEndDate?: string | Date;
};

export type EmployeeUpdate = Partial<
  Omit<EmployeeRecord, "employeeId" | "employmentBeginDate" | "employmentEndDate">
> & {
  employmentBeginDate?: string | Date;
  employmentEndDate?: string | Date;
};

export type BudgetRecord = {
  budgetId: string;
  projectId: string;
  clarityId: string;
  sponsorName: string;
  amount: number;
  year: number;
};

export type BudgetInput = Omit<BudgetRecord, "budgetId">;
export type BudgetUpdate = Partial<BudgetInput>;

export class WorkbookConflictError extends Error {}
export class WorkbookNotFoundError extends Error {}
export class WorkbookValidationError extends Error {}

const employeeHeaders = [
  "employeeId",
  "employeeName",
  "employeeType",
  "hourlyRate",
  "employmentBeginDate",
  "employmentEndDate",
];
const budgetHeaders = [
  "budgetId",
  "projectId",
  "clarityId",
  "sponsorName",
  "amount",
  "year",
];
const legacyWorkbookPath =
  process.env.BUDGET_WORKBOOK_PATH ??
  path.resolve(process.cwd(), "data", "budget-burndown.xlsx");
const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

let operationQueue: Promise<unknown> = Promise.resolve();

function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function dateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new WorkbookValidationError("A valid calendar date is required.");
  }
  return date.toISOString().slice(0, 10);
}

function cellString(value: ExcelJS.CellValue | undefined): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && "text" in value) {
    return String(value.text ?? "");
  }
  return value == null ? "" : String(value);
}

function cellNumber(value: ExcelJS.CellValue | undefined): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readTable<T>(sheet: ExcelJS.Worksheet, headers: string[]): T[] {
  const rows: T[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(
      headers.map((header, index) => [header, row.getCell(index + 1).value]),
    );
    if (headers.every((header) => values[header] == null || values[header] === "")) {
      return;
    }
    rows.push(values as T);
  });
  return rows;
}

function readEmployees(workbook: ExcelJS.Workbook): EmployeeRecord[] {
  const sheet = workbook.getWorksheet("Employees");
  if (!sheet) return [];
  return readTable<Record<string, ExcelJS.CellValue>>(sheet, employeeHeaders).map(
    (row) => ({
      employeeId: cellString(row.employeeId),
      employeeName: cellString(row.employeeName),
      employeeType: cellString(row.employeeType) as EmployeeType,
      hourlyRate: cellNumber(row.hourlyRate),
      employmentBeginDate: dateOnly(cellString(row.employmentBeginDate)),
      employmentEndDate: dateOnly(cellString(row.employmentEndDate)),
    }),
  );
}

function readBudgets(workbook: ExcelJS.Workbook): BudgetRecord[] {
  const sheet = workbook.getWorksheet("Budgets");
  if (!sheet) return [];
  return readTable<Record<string, ExcelJS.CellValue>>(sheet, budgetHeaders).map(
    (row) => ({
      budgetId: cellString(row.budgetId),
      projectId: cellString(row.projectId),
      clarityId: cellString(row.clarityId),
      sponsorName: cellString(row.sponsorName),
      amount: cellNumber(row.amount),
      year: cellNumber(row.year),
    }),
  );
}

function writeTable(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: Record<string, string | number>[],
): void {
  sheet.columns = headers.map((header) => ({ header, key: header, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

function seedWorkbook(workbook: ExcelJS.Workbook): void {
  const year = new Date().getUTCFullYear();
  const employees: EmployeeRecord[] = [
    {
      employeeId: "EMP-1001",
      employeeName: "Jordan Lee",
      employeeType: "FTE",
      hourlyRate: 84,
      employmentBeginDate: `${year}-01-01`,
      employmentEndDate: DEFAULT_EMPLOYMENT_END_DATE,
    },
    {
      employeeId: "EMP-1002",
      employeeName: "Sam Patel",
      employeeType: "CNE",
      hourlyRate: 96,
      employmentBeginDate: `${year}-03-15`,
      employmentEndDate: `${year}-12-31`,
    },
    {
      employeeId: "EMP-1003",
      employeeName: "Riley Chen",
      employeeType: "FTE",
      hourlyRate: 78,
      employmentBeginDate: `${year}-01-01`,
      employmentEndDate: `${year}-06-30`,
    },
  ];
  const budgets: BudgetRecord[] = [
    {
      budgetId: `BUD-${year}-001`,
      projectId: "DATA-PLATFORM",
      clarityId: "CL-4201",
      sponsorName: "Data Platform",
      amount: 460000,
      year,
    },
    {
      budgetId: `BUD-${year}-002`,
      projectId: "ANALYTICS-MODERNIZATION",
      clarityId: "CL-4215",
      sponsorName: "Analytics",
      amount: 240000,
      year,
    },
  ];

  writeTable(workbook.addWorksheet("Employees"), employeeHeaders, employees);
  writeTable(workbook.addWorksheet("Budgets"), budgetHeaders, budgets);
}

function getWorkbookFile() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateObjectDir) {
    throw new Error("Persistent workbook storage is not configured.");
  }
  const segments = privateObjectDir.replace(/^\/+|\/+$/g, "").split("/");
  const prefix = (segments[0] === bucketId ? segments.slice(1) : segments)
    .filter(Boolean)
    .join("/");
  const objectName = [prefix, "budget-burndown.xlsx"].filter(Boolean).join("/");
  return objectStorageClient.bucket(bucketId).file(objectName);
}

async function readLegacyWorkbook(): Promise<Buffer | null> {
  try {
    return await readFile(legacyWorkbookPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "ENOENT") return null;
    throw error;
  }
}

async function writeWorkbookFile(
  workbook: ExcelJS.Workbook,
  file = getWorkbookFile(),
): Promise<void> {
  const bytes = await workbook.xlsx.writeBuffer();
  await file.save(Buffer.from(bytes), {
    resumable: false,
    metadata: {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      cacheControl: "private, no-store",
    },
  });
}

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const file = getWorkbookFile();
  const [exists] = await file.exists();
  if (exists) {
    const [bytes] = await file.download();
    await workbook.xlsx.load(Buffer.from(bytes) as any);
  } else {
    const legacyBytes = await readLegacyWorkbook();
    if (legacyBytes) {
      await workbook.xlsx.load(legacyBytes as any);
      await file.save(legacyBytes, {
        resumable: false,
        metadata: {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          cacheControl: "private, no-store",
        },
      });
    } else {
      seedWorkbook(workbook);
      await writeWorkbookFile(workbook, file);
      return workbook;
    }
  }
  if (!workbook.getWorksheet("Employees")) {
    writeTable(workbook.addWorksheet("Employees"), employeeHeaders, []);
  }
  if (!workbook.getWorksheet("Budgets")) {
    writeTable(workbook.addWorksheet("Budgets"), budgetHeaders, []);
  }
  return workbook;
}

async function saveWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
  await writeWorkbookFile(workbook);
}

function setRows<T extends Record<string, string | number>>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headers: string[],
  rows: T[],
): void {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`Workbook sheet ${sheetName} is missing.`);
  sheet.spliceRows(2, sheet.rowCount);
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

function normalizeEmployee(employee: EmployeeRecord): EmployeeRecord {
  return {
    ...employee,
    employmentBeginDate: dateOnly(employee.employmentBeginDate),
    employmentEndDate: dateOnly(employee.employmentEndDate),
  };
}

export const budgetWorkbook = {
  async listEmployees(): Promise<EmployeeRecord[]> {
    return exclusive(async () => readEmployees(await loadWorkbook()));
  },

  async createEmployee(input: EmployeeInput): Promise<EmployeeRecord> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const employees = readEmployees(workbook);
      const employeeId = input.employeeId.trim();
      if (employees.some((employee) => employee.employeeId === employeeId)) {
        throw new WorkbookConflictError("An employee with this ID already exists.");
      }
      const employee = normalizeEmployee({
        employeeId,
        employeeName: input.employeeName.trim(),
        employeeType: input.employeeType,
        hourlyRate: input.hourlyRate,
        employmentBeginDate: dateOnly(input.employmentBeginDate),
        employmentEndDate: dateOnly(
          input.employmentEndDate ?? DEFAULT_EMPLOYMENT_END_DATE,
        ),
      });
      if (employee.employmentBeginDate > employee.employmentEndDate) {
        throw new WorkbookValidationError(
          "Employment begin date must be on or before end date.",
        );
      }
      setRows(workbook, "Employees", employeeHeaders, [
        ...employees.filter((item) => item.employeeId !== employeeId),
        employee,
      ]);
      await saveWorkbook(workbook);
      return employee;
    });
  },

  async updateEmployee(
    employeeId: string,
    update: EmployeeUpdate,
  ): Promise<EmployeeRecord> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const employees = readEmployees(workbook);
      const index = employees.findIndex((item) => item.employeeId === employeeId);
      if (index < 0) throw new WorkbookNotFoundError("Employee not found.");
      const current = employees[index]!;
      const next = normalizeEmployee({
        ...current,
        ...update,
        employmentBeginDate:
          update.employmentBeginDate == null
            ? current.employmentBeginDate
            : dateOnly(update.employmentBeginDate),
        employmentEndDate:
          update.employmentEndDate == null
            ? current.employmentEndDate
            : dateOnly(update.employmentEndDate),
        employeeName: update.employeeName?.trim() ?? current.employeeName,
      });
      if (next.employmentBeginDate > next.employmentEndDate) {
        throw new WorkbookValidationError(
          "Employment begin date must be on or before end date.",
        );
      }
      employees[index] = next;
      setRows(workbook, "Employees", employeeHeaders, employees);
      await saveWorkbook(workbook);
      return next;
    });
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const employees = readEmployees(workbook);
      const remaining = employees.filter((item) => item.employeeId !== employeeId);
      if (remaining.length === employees.length) {
        throw new WorkbookNotFoundError("Employee not found.");
      }
      setRows(workbook, "Employees", employeeHeaders, remaining);
      await saveWorkbook(workbook);
    });
  },

  async listBudgets(): Promise<BudgetRecord[]> {
    return exclusive(async () => readBudgets(await loadWorkbook()));
  },

  async createBudget(input: BudgetInput): Promise<BudgetRecord> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const budget: BudgetRecord = { ...input, budgetId: randomUUID() };
      const budgets = readBudgets(workbook);
      setRows(workbook, "Budgets", budgetHeaders, [...budgets, budget]);
      await saveWorkbook(workbook);
      return budget;
    });
  },

  async updateBudget(
    budgetId: string,
    update: BudgetUpdate,
  ): Promise<BudgetRecord> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const budgets = readBudgets(workbook);
      const index = budgets.findIndex((item) => item.budgetId === budgetId);
      if (index < 0) throw new WorkbookNotFoundError("Budget entry not found.");
      budgets[index] = { ...budgets[index]!, ...update };
      setRows(workbook, "Budgets", budgetHeaders, budgets);
      await saveWorkbook(workbook);
      return budgets[index]!;
    });
  },

  async deleteBudget(budgetId: string): Promise<void> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      const budgets = readBudgets(workbook);
      const remaining = budgets.filter((item) => item.budgetId !== budgetId);
      if (remaining.length === budgets.length) {
        throw new WorkbookNotFoundError("Budget entry not found.");
      }
      setRows(workbook, "Budgets", budgetHeaders, remaining);
      await saveWorkbook(workbook);
    });
  },

  async getAnnualData(): Promise<{
    employees: EmployeeRecord[];
    budgets: BudgetRecord[];
  }> {
    return exclusive(async () => {
      const workbook = await loadWorkbook();
      return {
        employees: readEmployees(workbook),
        budgets: readBudgets(workbook),
      };
    });
  },
};
