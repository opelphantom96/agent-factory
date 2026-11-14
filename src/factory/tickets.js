// Ticket loading + validation (the "spec" stage).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Find a ticket file by id: tickets/<id>.json or tickets/<id>-*.json */
export function findTicketFile(root, id) {
  const dir = join(root, 'tickets');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const match = files.find((f) => f === `${id}.json` || f.startsWith(`${id}-`));
  return match ? join(dir, match) : null;
}

export function loadTicket(root, id) {
  const file = findTicketFile(root, id);
  if (!file) return { ticket: null, errors: [`ticket ${id} not found in tickets/`] };
  let ticket;
  try {
    ticket = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { ticket: null, errors: [`ticket ${id} is not valid JSON: ${e.message}`] };
  }
  ticket._file = file;
  return { ticket, errors: [] };
}

/** Spec-stage validation (AGENTS.md rule 1–3 are checked again at plan review). */
export function validateTicket(root, ticket) {
  const errors = [];
  if (!ticket.id) errors.push('ticket.id is missing');
  if (!ticket.title) errors.push('ticket.title is missing');
  if (!ticket.goal) errors.push('ticket.goal is missing');
  if (!Array.isArray(ticket.acceptance) || ticket.acceptance.length === 0) {
    errors.push('ticket.acceptance must be a non-empty list');
  }
  if (!ticket.change) {
    errors.push('ticket.change (change script) is missing');
  } else if (!existsSync(join(root, ticket.change))) {
    errors.push(`change script not found: ${ticket.change}`);
  }
  if (!Array.isArray(ticket.tests) || ticket.tests.length === 0) {
    errors.push('ticket.tests must be a non-empty list (AGENTS.md rule 1)');
  }
  if (ticket.status !== 'ready') {
    errors.push(`ticket.status is "${ticket.status}", expected "ready"`);
  }
  return errors;
}

export function listTickets(root) {
  const dir = join(root, 'tickets');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .map((t) => ({ id: t.id, title: t.title, status: t.status }));
}
