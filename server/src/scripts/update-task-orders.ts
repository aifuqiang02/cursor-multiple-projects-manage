import { prisma } from '../lib/prisma.js';

/**
 * Update order values for existing tasks that have null order
 * This script should be run once to fix existing data
 */
async function updateTaskOrders() {
  try {
    console.log('Starting to update task orders...');

    // Get all projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true }
    });

    let totalUpdated = 0;

    for (const project of projects) {
      console.log(`Processing project: ${project.name}`);

      // Get tasks for this project, ordered by current logic
      const tasks = await prisma.task.findMany({
        where: { projectId: project.id },
        orderBy: [
          { order: { sort: 'asc', nulls: 'last' } }, // nulls last
          { priority: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      // Update order for tasks that have null order
      let orderCounter = 1;
      for (const task of tasks) {
        if (task.order === null) {
          await prisma.task.update({
            where: { id: task.id },
            data: { order: orderCounter }
          });
          totalUpdated++;
          console.log(`Updated task "${task.title}" with order ${orderCounter}`);
        } else {
          // If order exists, update counter to max existing order + 1
          orderCounter = Math.max(orderCounter, task.order + 1);
        }
      }

      console.log(`Project ${project.name} processed. Next order would be: ${orderCounter}`);
    }

    console.log(`Task order update completed. Total tasks updated: ${totalUpdated}`);
  } catch (error) {
    console.error('Error updating task orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateTaskOrders();
