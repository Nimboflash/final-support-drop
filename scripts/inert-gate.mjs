// 16 §7: the check-command NAMES are frozen in ticket 0.1. test:db and test:e2e
// stay inert until their owning tickets land content; the scripts exist so CI
// wiring never changes shape.
const [, , name, owningTicket] = process.argv;
console.log(`${name}: inert until ticket ${owningTicket} lands its content (ticket 0.1, 16 §7). Exit 0.`);
