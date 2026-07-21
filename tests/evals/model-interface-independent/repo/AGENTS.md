# Repository Instructions

Configuration belongs under `config/`. Extensions register through their
package-local registry; do not add extension behavior to core logging. Shared
wire contracts belong under `contracts/` and must remain compatible with
existing producers and consumers. Run `npm test` after changes.
