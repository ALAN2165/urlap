interface PgLikeError {
  code?: string;
  message?: string;
}

function extractQuoted(text: string): string | null {
  const match = /"([^"]+)"/.exec(text);
  return match ? match[1] : null;
}

function cleanRawMessage(message: string): string {
  return message.replace(/^error:\s*/i, '').split('\n')[0].trim();
}

/**
 * Converts a raw Postgres error into a short, friendly, actionable message
 * with no SQLSTATE codes, "ERROR:" prefixes, or server-internal jargon —
 * written for someone learning SQL, not debugging a database server.
 */
export function friendlyPgError(err: PgLikeError): string {
  const msg = err.message || '';
  const name = extractQuoted(msg);

  switch (err.code) {
    case '42601':
      return "There's a syntax error in your query. Double-check for missing commas, parentheses, or keywords like SELECT, FROM, or WHERE.";

    case '42703':
      return name
        ? `Column "${name}" doesn't exist. Check the spelling, or look at the Schema panel for the correct column names.`
        : "One of the columns you referenced doesn't exist. Check the spelling against the Schema panel.";

    case '42P01':
      return name
        ? `Table "${name}" doesn't exist. Did you mean "employees"?`
        : 'The table you referenced doesn\'t exist. Check the Schema panel for the correct table name.';

    case '42883': {
      const fnMatch = /function\s+([a-zA-Z0-9_."]+)\(/i.exec(msg);
      const fnName = fnMatch ? fnMatch[1].replace(/"/g, '') : null;
      return fnName
        ? `The function "${fnName}" isn't available, or isn't being called with the right argument types. Double-check the function name and what you're passing into it.`
        : "That function isn't available, or isn't being called with the right argument types.";
    }

    case '42702':
      return name
        ? `The column "${name}" exists in more than one table here — prefix it with the table name (e.g. employees.${name}) to say which one you mean.`
        : 'One of your columns is ambiguous — it exists in more than one table. Prefix it with the table name.';

    case '22P02':
      return "One of your values doesn't match the expected data type — for example, comparing text to a number. Check your WHERE conditions and any values you typed in.";

    case '22012':
      return 'Your query divides by zero somewhere — check any calculations involving a column or value that could be 0.';

    case '23502':
      return `A required value is missing${name ? ` for "${name}"` : ''}. This column can't be left empty.`;

    case '23505':
      return 'That value already exists and must be unique — try a different value.';

    case '42501':
      return "You don't have permission to do that here. Only SELECT-style queries (and the sandboxed statements this playground allows) are supported.";

    case '25006':
      return "This part of the grader runs in read-only mode, so that statement isn't allowed here.";

    case '3F000':
      return "That schema doesn't exist. You shouldn't need to reference a schema name directly — just use the table name (e.g. employees).";

    default:
      return `We couldn't run your query: ${cleanRawMessage(msg)}`;
  }
}