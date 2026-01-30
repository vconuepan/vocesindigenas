import { createReadStream } from 'fs';
import { createInterface } from 'readline';

/**
 * Streaming MySQL dump parser.
 *
 * Reads a MySQL dump file line by line and yields parsed rows for
 * INSERT INTO statements matching the target table.
 *
 * Handles:
 * - Multi-line INSERT statements (values spanning multiple lines)
 * - MySQL escaped single quotes (\' and '')
 * - Escaped backslashes (\\)
 * - NULL values
 * - Numeric values
 * - Values split across lines within parentheses
 */
export async function* parseMySqlDump<T>(
  filePath: string,
  tableName: string,
  columns: string[],
): AsyncGenerator<T> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  const insertPrefix = `INSERT INTO \`${tableName}\``;
  let buffer = '';
  let collecting = false;

  for await (const line of rl) {
    if (line.startsWith(insertPrefix)) {
      // Start of an INSERT statement — extract everything after VALUES
      const valuesIdx = line.indexOf('VALUES');
      if (valuesIdx === -1) continue;
      buffer = line.slice(valuesIdx + 6).trim();
      collecting = true;
    } else if (collecting) {
      // Continuation of a multi-line INSERT
      buffer += '\n' + line;
    } else {
      continue;
    }

    if (!collecting) continue;

    // Try to extract complete row tuples from the buffer
    const result = extractRows(buffer, columns);
    for (const row of result.rows) {
      yield row as T;
    }
    buffer = result.remaining;

    // If the buffer ends with a semicolon (after extracting rows), we're done with this INSERT
    if (buffer.trim().endsWith(';')) {
      collecting = false;
      buffer = '';
    }
  }
}

interface ExtractResult<T> {
  rows: T[];
  remaining: string;
}

function extractRows<T>(
  input: string,
  columns: string[],
): ExtractResult<T> {
  const rows: T[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Find the opening parenthesis
    const openParen = input.indexOf('(', pos);
    if (openParen === -1) break;

    // Find the matching closing parenthesis, respecting quoted strings
    const closeResult = findClosingParen(input, openParen);
    if (closeResult === -1) {
      // Incomplete tuple — return what's left as remaining
      return { rows, remaining: input.slice(openParen) };
    }

    const tupleStr = input.slice(openParen + 1, closeResult);
    const values = parseTupleValues(tupleStr);

    if (values.length === columns.length) {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = values[i];
      }
      rows.push(row as T);
    } else if (values.length > 0) {
      console.warn(
        `SQL parser: row has ${values.length} values but expected ${columns.length} columns (skipped)`,
      );
    }

    pos = closeResult + 1;
    // Skip comma or semicolon between tuples
    while (pos < input.length && (input[pos] === ',' || input[pos] === ';' || input[pos] === '\n' || input[pos] === '\r' || input[pos] === ' ' || input[pos] === '\t')) {
      pos++;
    }
  }

  return { rows, remaining: input.slice(pos) };
}

/**
 * Find the closing parenthesis matching the one at `start`,
 * skipping over quoted strings.
 */
function findClosingParen(input: string, start: number): number {
  let pos = start + 1;
  let depth = 1;

  while (pos < input.length && depth > 0) {
    const ch = input[pos];

    if (ch === "'") {
      // Skip quoted string
      pos++;
      while (pos < input.length) {
        if (input[pos] === '\\') {
          pos += 2; // skip escaped char
          continue;
        }
        if (input[pos] === "'") {
          if (pos + 1 < input.length && input[pos + 1] === "'") {
            pos += 2; // escaped quote ''
            continue;
          }
          break; // end of string
        }
        pos++;
      }
      pos++; // skip closing quote
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') depth--;
    pos++;
  }

  return depth === 0 ? pos - 1 : -1;
}

/**
 * Parse the comma-separated values inside a tuple like:
 *   1, 'hello', NULL, 42, 'it\'s a test'
 */
function parseTupleValues(tuple: string): (string | number | null)[] {
  const values: (string | number | null)[] = [];
  let pos = 0;

  while (pos <= tuple.length) {
    // Skip whitespace
    while (pos < tuple.length && (tuple[pos] === ' ' || tuple[pos] === '\t' || tuple[pos] === '\n' || tuple[pos] === '\r')) {
      pos++;
    }

    if (pos >= tuple.length) break;

    if (tuple[pos] === "'") {
      // String value
      pos++; // skip opening quote
      let str = '';
      while (pos < tuple.length) {
        if (tuple[pos] === '\\') {
          // MySQL escape sequences
          pos++;
          if (pos < tuple.length) {
            const escaped = tuple[pos];
            switch (escaped) {
              case 'n': str += '\n'; break;
              case 'r': str += '\r'; break;
              case 't': str += '\t'; break;
              case '0': str += '\0'; break;
              default: str += escaped; break; // \' \\ etc.
            }
          }
          pos++;
          continue;
        }
        if (tuple[pos] === "'") {
          if (pos + 1 < tuple.length && tuple[pos + 1] === "'") {
            str += "'";
            pos += 2;
            continue;
          }
          pos++; // skip closing quote
          break;
        }
        str += tuple[pos];
        pos++;
      }
      values.push(str);
    } else if (tuple.slice(pos, pos + 4).toUpperCase() === 'NULL') {
      values.push(null);
      pos += 4;
    } else {
      // Numeric value
      let numStr = '';
      while (pos < tuple.length && tuple[pos] !== ',' && tuple[pos] !== ')') {
        numStr += tuple[pos];
        pos++;
      }
      numStr = numStr.trim();
      const num = Number(numStr);
      values.push(isNaN(num) ? numStr : num);
    }

    // Skip comma separator
    while (pos < tuple.length && (tuple[pos] === ' ' || tuple[pos] === '\t' || tuple[pos] === '\n' || tuple[pos] === '\r')) {
      pos++;
    }
    if (pos < tuple.length && tuple[pos] === ',') {
      pos++;
    }
  }

  return values;
}
