# flowsavvy-api

Standalone TypeScript client for interacting with FlowSavvy, implementing the official web API format as reverse-engineered from the ChrisvanChip/flowsavvy-linear integration.

## Features

- Handles login/form authentication with XSRF tokens and cookies (exact match to FlowSavvy web API)
- Search, create, edit, complete, delete tasks
- Schedule recalculation
- Compatible with Node.js, requires email/password/timezone per user

## Usage

```typescript
import { FlowSavvyClient } from "flowsavvy-api";

const client = new FlowSavvyClient({
  email: process.env.FLOWSAVVY_EMAIL!,
  password: process.env.FLOWSAVVY_PASSWORD!,
  timezone: process.env.FLOWSAVVY_TIMEZONE!
});

async function run() {
  await client.login();

  const found = await client.searchTask("Demo Task Title");
  if (found) {
    await client.markTaskComplete(found.id);
  }

  // Create a new task
  const task = {
    id: 0,
    DurationHours: 1,
    DurationMinutes: 30,
    Title: "My New Task",
    Notes: "Created by API",
    CalendarID: 123456,
    // ... see Task.ts from upstream for possible fields
  };

  await client.createOrEditTask(task);
  await client.forceRecalculate();
}

run();
```

## API

- `login()`
- `searchTask(query)`
- `createOrEditTask(task, edit?)`
- `markTaskComplete(taskId)`
- `deleteTask(taskId)`
- `forceRecalculate()`

## License

MIT
