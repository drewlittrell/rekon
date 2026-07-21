# Repository Rules

- Keep the HTTP controller contract stable unless the task explicitly changes it.
- Domain lifecycle changes must preserve authorization and persistence behavior.
- Add or update tests for lifecycle behavior.
- Terminal billing states must not be silently reactivated.
- Refactors must preserve public method signatures and domain error behavior.
- Payment review routing belongs in the risk worker, and thresholds come from
  the shared risk contract.
- Account suspension must authorize first, revoke sessions, persist the
  suspension, and then record the security audit event.
- Refund authorization must happen before any repository mutation.
