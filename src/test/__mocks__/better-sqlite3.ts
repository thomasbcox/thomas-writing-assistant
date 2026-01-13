/**
 * Mock for better-sqlite3
 * Provides in-memory database functionality without requiring native module
 */

import { EventEmitter } from "events";

interface MockStatement {
  bind(...params: unknown[]): MockStatement;
  run(...params: unknown[]): { changes: number; lastInsertRowid: bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  raw(...params: unknown[]): { get: () => unknown[]; all: () => unknown[] };
  finalize(): void;
}

interface MockDatabase extends EventEmitter {
  prepare(sql: string): MockStatement;
  exec(sql: string): void;
  close(): void;
  pragma(key: string, options?: { simple?: boolean }): unknown;
}

class MockStatementImpl implements MockStatement {
  private sql: string;
  private db: MockDatabaseImpl;
  private finalized = false;

  constructor(sql: string, db: MockDatabaseImpl) {
    this.sql = sql;
    this.db = db;
  }

  bind(...params: unknown[]): MockStatement {
    return this;
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: bigint } {
    if (this.finalized) throw new Error("Statement finalized");
    // Execute the SQL against the mock database
    const result = this.db.executeSQL(this.sql, params);
    // Extract ID from result for lastInsertRowid
    let rowId = BigInt(1);
    if (result && typeof result === "object" && "id" in result) {
      const idStr = String(result.id);
      // Try to extract numeric part, or use a hash
      const numericPart = idStr.replace(/[^0-9]/g, "");
      rowId = numericPart ? BigInt(numericPart) : BigInt(idStr.length || 1);
    }
    // Store lastInsertRowid on the database instance
    (this.db as any).lastInsertRowid = rowId;
    return { changes: 1, lastInsertRowid: rowId };
  }

  get(...params: unknown[]): unknown {
    if (this.finalized) throw new Error("Statement finalized");
    const result = this.db.querySQL(this.sql, params);
    // get() returns a single row (object) or undefined, not an array
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : undefined;
    }
    return result || undefined;
  }

  all(...params: unknown[]): unknown[] {
    if (this.finalized) throw new Error("Statement finalized");
    const result = this.db.querySQL(this.sql, params);
    return Array.isArray(result) ? result : result ? [result] : [];
  }

  raw(...params: unknown[]): { get: () => unknown[]; all: () => unknown[] } {
    if (this.finalized) throw new Error("Statement finalized");
    const result = this.db.querySQL(this.sql, params);
    // Helper to convert result to array of arrays
    const toArrayOfArrays = () => {
      if (Array.isArray(result)) {
        return result.map((row) => {
          if (typeof row === "object" && row !== null) {
            return Object.values(row);
          }
          return [row];
        });
      }
      return result ? [[result]] : [];
    };
    // raw() returns an object with get() and all() methods
    return {
      get: toArrayOfArrays,
      all: toArrayOfArrays,
    };
  }

  finalize(): void {
    this.finalized = true;
  }
}

class MockDatabaseImpl extends EventEmitter implements MockDatabase {
  private data: Map<string, unknown[]> = new Map();
  private tables: Set<string> = new Set();

  constructor(path: string) {
    super();
    if (path !== ":memory:") {
      // For file-based databases, we still use in-memory for tests
      console.warn(`Mock better-sqlite3: Using in-memory storage for ${path}`);
    }
  }

  prepare(sql: string): MockStatement {
    return new MockStatementImpl(sql, this);
  }

  exec(sql: string): void {
    // Simple SQL execution for CREATE TABLE, etc.
    const statements = sql.split(";").filter((s) => s.trim());
    for (const statement of statements) {
      const trimmed = statement.trim().toUpperCase();
      if (trimmed.startsWith("CREATE TABLE")) {
        const tableMatch = trimmed.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
        if (tableMatch) {
          this.tables.add(tableMatch[1]);
          this.data.set(tableMatch[1], []);
        }
      }
    }
  }

  pragma(key: string, options?: { simple?: boolean }): unknown {
    // Return mock pragma values
    if (key === "foreign_keys") return 1;
    if (key === "journal_mode") return "WAL";
    return null;
  }

  close(): void {
    this.data.clear();
    this.tables.clear();
  }

  // Internal methods for mock implementation
  executeSQL(sql: string, params: unknown[]): Record<string, unknown> | null {
    const upperSQL = sql.toUpperCase().trim();
    if (upperSQL.startsWith("INSERT")) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'better-sqlite3.ts:142',message:'executeSQL INSERT',data:{sql:sql.substring(0,500),params:params.map(p=>typeof p==='object'?String(p):p),paramsLength:params.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Handle INSERT - Drizzle uses parameterized queries with ? placeholders
      const tableMatch = sql.match(/INTO\s+["']?(\w+)["']?/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (!this.data.has(tableName)) {
          this.data.set(tableName, []);
        }
        
        // Extract column names from SQL (Drizzle includes them)
        const columnsMatch = sql.match(/INTO\s+["']?\w+["']?\s*\(([^)]+)\)/i);
        const row: Record<string, unknown> = {};
        
        if (columnsMatch) {
          // Named columns - parse column list
          const columns = columnsMatch[1]
            .split(",")
            .map(c => c.trim().replace(/["']/g, ""))
            .filter(c => c.length > 0);
          
          // Extract VALUES clause to find null placeholders
          const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);
          let paramIndex = 0;
          
          if (valuesMatch) {
            // Parse VALUES to identify which positions are null vs parameters
            const values = valuesMatch[1].split(",").map(v => v.trim());
            
            columns.forEach((col, colIndex) => {
              const valueExpr = values[colIndex];
              // Check if this position is null (literal null, not a parameter)
              if (valueExpr && /^null$/i.test(valueExpr)) {
                row[col] = null;
              } else {
                // This position is a parameter - use the next param from the array
                row[col] = params[paramIndex] ?? null;
                paramIndex++;
              }
            });
          } else {
            // Fallback: map params to columns by index (old behavior)
            columns.forEach((col, index) => {
              row[col] = params[index] ?? null;
            });
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'better-sqlite3.ts:185',message:'executeSQL mapped row',data:{tableName,columns,row,expiresAtValue:row.expiresAt,expiresAtType:typeof row.expiresAt,paramIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } else {
          // No column list - use positional params with generic names
          params.forEach((param, index) => {
            row[`col${index}`] = param;
          });
        }
        
        // Generate ID if not provided (Drizzle uses cuid2 which generates IDs)
        if (!row.id && tableName !== "sqlite_master") {
          // Use a simple ID generator
          row.id = `mock-${tableName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        }
        
        const insertedRow = { ...row }; // Clone the row
        this.data.get(tableName)!.push(insertedRow);
        // Store the last inserted row for this table (for lastInsertRowid queries)
        (this as any).lastInsertRowid = insertedRow.id ? BigInt(String(insertedRow.id).replace(/[^0-9]/g, "") || "1") : BigInt(1);
        return insertedRow; // Return inserted row for .returning()
      }
    } else if (upperSQL.startsWith("DELETE")) {
      // Handle DELETE
      const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // If there's a WHERE clause, we'd need to filter, but for simplicity, clear all
        // In real tests, this might need WHERE clause parsing
        if (params.length === 0) {
          this.data.set(tableName, []);
        } else {
          // Simple WHERE id = ? handling
          const existingData = this.data.get(tableName) || [];
          const filtered = existingData.filter((row: any) => {
            if (typeof row === "object" && row !== null) {
              // Check if any field matches the param
              return !Object.values(row).some(val => params.includes(val));
            }
            return true;
          });
          this.data.set(tableName, filtered);
        }
      }
    } else if (upperSQL.startsWith("UPDATE")) {
      // Handle UPDATE (simplified)
      const tableMatch = sql.match(/UPDATE\s+["']?(\w+)["']?/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (!this.data.has(tableName)) {
          this.data.set(tableName, []);
        }
        // For simplicity, UPDATE is a no-op in mock (data stays the same)
        // Real implementation would need SET clause parsing
      }
    }
    return null;
  }

  querySQL(sql: string, params: unknown[]): unknown {
    const upperSQL = sql.toUpperCase().trim();
    if (upperSQL.startsWith("SELECT")) {
      // Handle sqlite_master queries (for table listing)
      if (sql.includes("sqlite_master")) {
        const tables: Array<{ name: string; type: string }> = [];
        for (const tableName of this.tables) {
          tables.push({ name: tableName, type: "table" });
        }
        return tables;
      }
      
      // Handle regular table queries
      const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        let tableData = this.data.get(tableName) || [];
        
        // Handle WHERE clauses with improved parsing
        if (sql.includes("WHERE") && params.length > 0) {
          tableData = this.applyWhereClause(tableData, sql, params);
        }
        
        // Handle LIMIT clause
        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1], 10);
          tableData = tableData.slice(0, limit);
        }
        
        return tableData;
      }
    }
    return [];
  }

  /**
   * Apply WHERE clause filtering to table data
   * Supports common patterns:
   * - WHERE column = ?
   * - WHERE column IN (?, ?, ?)
   * - WHERE column1 = ? AND column2 = ?
   * - WHERE column IS NULL
   * - WHERE column IS NOT NULL
   */
  private applyWhereClause(
    data: unknown[],
    sql: string,
    params: unknown[]
  ): unknown[] {
    let filtered = data;
    let paramIndex = 0;

    // Handle multiple WHERE conditions (AND/OR)
    const whereClause = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (!whereClause) {
      return filtered;
    }

    const conditions = whereClause[1];
    
    // Split by AND (simple case - no parentheses)
    const andConditions = conditions.split(/\s+AND\s+/i);
    
    for (const condition of andConditions) {
      const trimmed = condition.trim();
      
      // Handle column = ?
      const eqMatch = trimmed.match(/^["']?(\w+)["']?\s*=\s*\?/i);
      if (eqMatch && paramIndex < params.length) {
        const columnName = eqMatch[1];
        const paramValue = params[paramIndex++];
        filtered = filtered.filter((row: any) => {
          if (typeof row === "object" && row !== null) {
            const rowValue = row[columnName];
            return rowValue === paramValue || 
                   String(rowValue) === String(paramValue);
          }
          return false;
        });
        continue;
      }
      
      // Handle column IN (?, ?, ?)
      const inMatch = trimmed.match(/^["']?(\w+)["']?\s+IN\s*\(([^)]+)\)/i);
      if (inMatch) {
        const columnName = inMatch[1];
        const placeholders = inMatch[2].match(/\?/g);
        if (placeholders) {
          const inValues: unknown[] = [];
          for (let i = 0; i < placeholders.length && paramIndex < params.length; i++) {
            inValues.push(params[paramIndex++]);
          }
          filtered = filtered.filter((row: any) => {
            if (typeof row === "object" && row !== null) {
              const rowValue = row[columnName];
              return inValues.some(val => 
                rowValue === val || String(rowValue) === String(val)
              );
            }
            return false;
          });
          continue;
        }
      }
      
      // Handle column IS NULL
      const isNullMatch = trimmed.match(/^["']?(\w+)["']?\s+IS\s+NULL/i);
      if (isNullMatch) {
        const columnName = isNullMatch[1];
        filtered = filtered.filter((row: any) => {
          if (typeof row === "object" && row !== null) {
            return row[columnName] === null || row[columnName] === undefined;
          }
          return false;
        });
        continue;
      }
      
      // Handle column IS NOT NULL
      const isNotNullMatch = trimmed.match(/^["']?(\w+)["']?\s+IS\s+NOT\s+NULL/i);
      if (isNotNullMatch) {
        const columnName = isNotNullMatch[1];
        filtered = filtered.filter((row: any) => {
          if (typeof row === "object" && row !== null) {
            return row[columnName] !== null && row[columnName] !== undefined;
          }
          return false;
        });
        continue;
      }
      
      // Handle column != ? or column <>
      const neMatch = trimmed.match(/^["']?(\w+)["']?\s*(?:!=|<>)\s*\?/i);
      if (neMatch && paramIndex < params.length) {
        const columnName = neMatch[1];
        const paramValue = params[paramIndex++];
        filtered = filtered.filter((row: any) => {
          if (typeof row === "object" && row !== null) {
            const rowValue = row[columnName];
            return rowValue !== paramValue && 
                   String(rowValue) !== String(paramValue);
          }
          return false;
        });
        continue;
      }
    }
    
    return filtered;
  }

  // Expose data for test inspection
  getTableData(tableName: string): unknown[] {
    return this.data.get(tableName) || [];
  }

  setTableData(tableName: string, data: unknown[]): void {
    this.data.set(tableName, data);
  }
}

// Export mock Database class
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockDatabase = MockDatabaseImpl as any;

export default MockDatabase;
export { MockDatabaseImpl };

