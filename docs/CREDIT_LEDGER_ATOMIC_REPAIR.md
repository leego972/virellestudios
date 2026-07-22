# Atomic Credit Ledger Repair

## Scope

The central credit system now serialises balance changes per user and commits the balance mutation and transaction ledger row in the same database transaction.

## Non-admin deductions

- Credit amounts must be positive whole numbers.
- The user row is locked with `FOR UPDATE` before reading the live balance.
- Insufficient balances fail before any generation work starts.
- The balance, total spent counter and negative ledger entry commit together.
- Concurrent requests cannot spend the same credits or record stale `balanceAfter` values.

## Admin exemption

Administrator actions create an audit entry with amount zero and do not change the administrator balance.

## Async reservations

- Reservation creation, deduction and ledger creation are one transaction.
- A failed reservation insert rolls back the deduction.
- Duplicate requests for the same user/reference are serialised through the user-row lock.
- Administrator jobs do not create monetary reservations, preventing refunds for credits that were never charged.
- Finalisation is idempotent.
- Failed-job release locks the reservation and refunds exactly once.
- The refund, ledger entry and released status commit together.

## Regression coverage

`server/credit-ledger-regression.test.ts` asserts the row locking, transaction boundaries, failed-insert rollback guard and single-use refund transition remain present.
