import { resolve } from 'node:path';
import { Store } from '../storage/index.js';
import { DemoTasks, DEMO_LIST } from '../demo/index.js';
import { TaskService } from '../service/index.js';
export const dataPath=resolve(process.env.TASKS_DATA_DIR ?? '.data');
export function demoRuntime() {
  const store=new Store(resolve(dataPath,'demo.sqlite'));
  const adapter=new DemoTasks(store);
  const service=new TaskService(adapter,store,{principal:'local-demo-owner',connection:'synthetic-v1'},[DEMO_LIST]);
  return {store,adapter,service};
}
