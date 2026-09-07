/**
 * Injection tokens for the scheduler.
 *
 * Their own file because both the module that provides them and the services
 * that consume them need them, and importing them from the module would make
 * the module import its own consumers.
 */

/** The resolved SchedulerConfig. */
export const SCHEDULER_CONFIG = Symbol('SCHEDULER_CONFIG');

/**
 * The BullMQ `Queue` for CHECKS_QUEUE.
 *
 * BullMQ is used directly rather than through `@nestjs/bullmq`. That package
 * is ESM-only from v12, and this repository's Jest setup is still CommonJS —
 * the same wall that has NestJS 12 held back in dependabot.yml. Taking it
 * would have meant either a fifth version hold or an ESM migration in a
 * ticket that is about a timer. `bullmq` itself ships CJS, is what STACK.md
 * actually mandates, and the wrapper it replaces is two providers.
 */
export const CHECKS_QUEUE_TOKEN = Symbol('CHECKS_QUEUE');
