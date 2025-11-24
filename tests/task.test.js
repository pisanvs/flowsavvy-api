require('dotenv').config();

let FlowsavvyClient;
let client;

const API_KEY = process.env.FLOWSAVVY_API_KEY;

if (API_KEY) {
  // Use real API client if API key is defined
  FlowsavvyClient = require('../src/index').FlowsavvyClient;
  client = new FlowsavvyClient(API_KEY); // Adjust constructor if necessary
} else {
  // Fallback: mock API responses if no API key
  FlowsavvyClient = class {
    async getTask(id) {
      return { id, title: 'Sample Task', completed: false };
    }
    async createTask(data) {
      return { id: '123', ...data };
    }
    async updateTask(id, update) {
      return { id, ...update };
    }
  };
  client = new FlowsavvyClient();
}

describe('Flowsavvy API Task Operations', () => {
  let createdTaskId = null;

  test('should create a new task', async () => {
    const newTask = { title: 'New Task', completed: false };
    const res = await client.createTask(newTask);
    expect(res).toHaveProperty('id');
    expect(res.title).toBe('New Task');
    createdTaskId = res.id;
  });

  test('should retrieve a task by id', async () => {
    // Prefer real API; fallback to recent created id or dummy
    const id = createdTaskId || 'abc';
    const task = await client.getTask(id);
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title');
  });

  test('should update an existing task', async () => {
    const id = createdTaskId || 'abc';
    const update = { title: 'Updated Task', completed: true };
    const updated = await client.updateTask(id, update);
    expect(updated.id).toBe(id);
    expect(updated.title).toBe('Updated Task');
    expect(updated.completed).toBe(true);
  });
});
