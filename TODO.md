# TODO

## Priority Plan

### P0 - Functional Navigation

- [x] Add route support for key sections (Insights, Automation, Network, Security).
- [x] Fix sidebar links so each item points to its own route.
- [x] Fix top tabs so each tab points to its own route and active states are accurate.

### P1 - Wire Placeholder Actions

- [x] Wire New Widget button to a dedicated route stub.
- [x] Wire Support and Log out links to dedicated route stubs.
- [x] Wire headlines-section Refresh all to actual refresh behavior.

### P2 - Flesh Out Stubs

- [ ] Implement real page content for Insights.
- [ ] Implement real page content for Automation.
- [ ] Implement real page content for Network.
- [ ] Implement real page content for Security.
- [ ] Implement widget creation form and persistence on the New Widget route.
- [ ] Connect Log out route to real authentication sign-out flow.
- [ ] Build actual Support experience (runbooks/contact/escalation links).

### P3 - UX Decisions

- [ ] Decide whether top action chips are decorative or interactive.
- [ ] If interactive: replace chips with accessible buttons and handlers.
- [ ] If decorative: keep as non-interactive and document intent.

## Notes

- Completed in this pass: route wiring and control/link behavior improvements in src/App.jsx.
- Remaining work is primarily page implementation depth and auth/support integration.
