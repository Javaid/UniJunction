# Domain Modules

This directory is the seam for the modular monolith. Each future domain
(auth, users, universities, departments, programs, students, faculty,
researchers, skills, interests, research, projects, connections,
mentorship, messaging, events, opportunities, notifications,
administration) will live in its own subfolder here, for example:

```
modules/
  auth/
    auth.controller.js
    auth.routes.js
    auth.service.js
    auth.validator.js
  users/
    ...
```

Keeping each domain self-contained (controller, routes, service,
validator, model references) means it can be lifted into a separate
service later with minimal rework. No domains are implemented yet —
this chunk only establishes the placeholder.
