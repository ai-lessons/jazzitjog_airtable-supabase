import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { spawn, ChildProcess } from 'child_process';
import { URL } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import * as fs from 'fs';


// Type for child process result
type ChildResult =
  | { ok: true; outcome: 'success' }
  | { ok: false; outcome: 'timeout' | 'spawn_error' | 'child_error' };

// Configure logger
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Debug flag for verbose logging
const debugRunnerRaw = (process.env.DEBUG_RUNNER || '').trim().toLowerCase();
const isDebug = ['1','true','yes'].includes(debugRunnerRaw);

// Strict startup check for required environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  '';
const forceId = process.env.FORCE_ID ? parseInt(process.env.FORCE_ID, 10) : null;
const forceIds = process.env.FORCE_IDS 
  ? process.env.FORCE_IDS.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
  : null;
const forceOverwrite = process.env.FORCE_OVERWRITE === '1';
const batchSize = parseInt(process.env.BATCH_SIZE || '10', 10);
const childTimeoutMs = parseInt(process.env.CHILD_TIMEOUT_MS || '30000', 10);

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please ensure SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY are set in your .env file.');
  process.exit(1);
}

// Custom fetch with timeout for Supabase client
async function fetchWithTimeout(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = parseInt(process.env.SUPABASE_FETCH_TIMEOUT_MS || '15000', 10);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Combine signals if init.signal exists
  let signal: AbortSignal;
  if (init?.signal) {
    // Create a combined abort controller
    const combinedController = new AbortController();
    
    // Abort combined controller when either signal aborts
    const abortHandler = () => combinedController.abort();
    controller.signal.addEventListener('abort', abortHandler);
    init.signal.addEventListener('abort', abortHandler);
    
    // Clean up listeners when either signal aborts
    combinedController.signal.addEventListener('abort', () => {
      controller.signal.removeEventListener('abort', abortHandler);
      if (init?.signal) {
        init.signal.removeEventListener('abort', abortHandler);
      }
    });
    
    signal = combinedController.signal;
  } else {
    signal = controller.signal;
  }
  
  const fetchOptions = {
    ...init,
    signal
  };
  
  try {
    const response = await fetch(input, fetchOptions);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function updateRowAsTimeout(id: number, supabase: any, lastStage: string | null, lastStageAt: string | null) {
  logger.info({
    ID: id,
    step: 'child_timeout_update_start',
    lastStage,
    lastStageAt
  }, 'Updating row as timeout after child process exceeded limit');

  const specsJson: any = {
    mode: 'skipped' as const,
    reason: 'timeout',
    timeout_ms: childTimeoutMs,
    // Telemetry with unknown values (runner synthesized)
    source_used: 'unknown',
    content_len: 0,
    fetched_html_bytes: 0,
    runner_synthesized: true
  };

  // Add last_stage and last_stage_at if available
  if (lastStage) {
    specsJson.last_stage = lastStage;
  }
  if (lastStageAt) {
    specsJson.last_stage_at = lastStageAt;
  }

  const { error } = await supabase
    .from('JazzItJog_db')
    .update({
      specs_json: specsJson,
      specs_extracted_at: new Date().toISOString(),
      specs_method: 'dom_timeout'
    })
    .or(`specs_json.is.null,specs_json->>mode.eq.skipped`)
    .eq('ID', id);

  if (error) {
    logger.error({
      ID: id,
      step: 'child_timeout_update_error',
      errorMessage: error.message
    }, 'Failed to update row after timeout');
    return false;
  }

  logger.info({
    ID: id,
    step: 'child_timeout_update_done'
  }, 'Row updated as timeout successfully');
  return true;
}

async function updateRowAsFailure(id: number, supabase: any, reason: string, exitCode?: number, lastStage?: string | null, lastStageAt?: string | null) {
  logger.info({
    ID: id,
    step: 'child_failure_update_start',
    reason,
    lastStage,
    lastStageAt
  }, 'Updating row as failure');

  const specsJson: any = {
    mode: 'skipped' as const,
    reason,
    // Telemetry with unknown values (runner synthesized)
    source_used: 'unknown',
    content_len: 0,
    fetched_html_bytes: 0,
    runner_synthesized: true
  };

  if (exitCode !== undefined) {
    specsJson.exit_code = exitCode;
  }

  // Add stage information if available
  if (lastStage) {
    specsJson.last_stage = lastStage;
  }
  if (lastStageAt) {
    specsJson.last_stage_at = lastStageAt;
  }

  let specsMethod = 'dom_error';
  if (reason === 'spawn_error') {
    specsMethod = 'dom_spawn_error';
  } else if (reason === 'child_error') {
    specsMethod = 'dom_child_error';
  }

  const { error } = await supabase
    .from('JazzItJog_db')
    .update({
      specs_json: specsJson,
      specs_extracted_at: new Date().toISOString(),
      specs_method: specsMethod
    })
    .or(`specs_json.is.null,specs_json->>mode.eq.skipped`)
    .eq('ID', id);

  if (error) {
    logger.error({
      ID: id,
      step: 'child_failure_update_error',
      errorMessage: error.message
    }, 'Failed to update row after failure');
    return false;
  }

  logger.info({
    ID: id,
    step: 'child_failure_update_done'
  }, 'Row updated as failure successfully');
  return true;
}

async function runChildProcess(id: number, supabase: any, extraEnv?: Record<string, string>): Promise<ChildResult> {
  return new Promise((resolve) => {
    logger.info({
      ID: id,
      step: 'child_process_start',
      timeout_ms: childTimeoutMs
    }, 'Starting child process for article');

    // Stage tracking from child's stdout
    let lastStage: string | null = null;
    let lastStageAt: string | null = null;
    
    // Single finalize path to prevent double resolve/cleanup
    let finished = false;
    let timeoutId: NodeJS.Timeout;
    let sawClose = false;
    
      const finalizeOnce = async (meta: { kind: 'close' | 'error' | 'timeout'; code?: number; err?: any } = { kind: 'close', code: 1 }) => {
      if (finished) return;
      finished = true;

      clearTimeout(timeoutId);

      let result: ChildResult;
      
      if (meta.kind === 'close') {
        sawClose = true;
        if (meta.code === 0) {
          result = { ok: true, outcome: 'success' };
        } else {
          // Non-zero exit code
          await updateRowAsFailure(id, supabase, 'child_error', meta.code, lastStage, lastStageAt);
          result = { ok: false, outcome: 'child_error' };
        }
      } else if (meta.kind === 'timeout') {
        await updateRowAsTimeout(id, supabase, lastStage, lastStageAt);
        result = { ok: false, outcome: 'timeout' };
      } else if (meta.kind === 'error') {
        await updateRowAsFailure(id, supabase, 'spawn_error', undefined, lastStage, lastStageAt);
        result = { ok: false, outcome: 'spawn_error' };
      } else {
        // Should not happen
        result = { ok: false, outcome: 'child_error' };
      }

      resolve(result);
    };

    // Use node to run the tsx module directly (cross-platform)
    const tsxModulePath = pathResolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

    // Generate fingerprint for child
    const childFingerprint = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Log CHILD_COMMAND details before spawning
    if (isDebug) {
      logger.info({
        ID: id,
        step: 'CHILD_COMMAND',
        nodePath: process.execPath,
        tsxModulePath,
        scriptPath: 'scripts/backfill-specs-dom.ts',
        env: {
          FORCE_ID: id.toString(),
          DOM_PARSE_TIMEOUT_MS: process.env.DOM_PARSE_TIMEOUT_MS || '5000',
          SUPABASE_FETCH_TIMEOUT_MS: process.env.SUPABASE_FETCH_TIMEOUT_MS || '15000',
          RUNNER_CHILD_FINGERPRINT: childFingerprint
        }
      }, 'Child command details');
    } else {
      logger.info({
        ID: id,
        step: 'CHILD_COMMAND',
        nodePath: process.execPath,
        tsxModulePath,
        scriptPath: 'scripts/backfill-specs-dom.ts',
        timeout_ms: childTimeoutMs
      }, 'Child command details');
    }

    // Log immediately before spawning
    const absoluteScriptPath = pathResolve(process.cwd(), 'scripts/backfill-specs-dom.ts');
    logger.info({
      ID: id,
      step: 'child_spawn_about_to_spawn',
      nodePath: process.execPath,
      tsxModulePath,
      scriptPath: absoluteScriptPath
    }, 'About to spawn child process');

    // Step 1: Check existence of tsx module and script
    logger.info({
      ID: id,
      step: 'tsx_path_check',
      tsxModulePath,
      scriptPath: absoluteScriptPath
    }, 'Checking tsx module and script paths');

    let tsxModuleExists = false;
    let scriptExists = false;
    let tsxStatError = null;
    let scriptStatError = null;

    try {
      fs.statSync(tsxModulePath);
      tsxModuleExists = true;
    } catch (e: any) {
      tsxStatError = e.message;
    }

    try {
      fs.statSync(absoluteScriptPath);
      scriptExists = true;
    } catch (e: any) {
      scriptStatError = e.message;
    }

    if (!tsxModuleExists || !scriptExists) {
      logger.error({
        ID: id,
        step: 'tsx_path_missing',
        tsxModuleExists,
        scriptExists,
        tsxModulePath,
        scriptPath: absoluteScriptPath,
        tsxStatError,
        scriptStatError,
        msg: 'Missing required file for child process'
      });
      (async () => {
        await updateRowAsFailure(id, supabase, 'dom_spawn_error', undefined);
        resolve({ ok: false, outcome: 'spawn_error' });
      })();
      return;
    }

    let child: ChildProcess;
    let spawnfile: string;
    let spawnargs: string[];
    try {
      // Prepare environment with unbuffered output settings
      const env = {
        ...process.env,
        FORCE_ID: id.toString(),
        RUNNER_CHILD_FINGERPRINT: childFingerprint,
        DOM_PARSE_TIMEOUT_MS: process.env.DOM_PARSE_TIMEOUT_MS || '5000',
        SUPABASE_FETCH_TIMEOUT_MS: process.env.SUPABASE_FETCH_TIMEOUT_MS || '15000',
        NODE_DISABLE_COLORS: '1',
        NODE_ENV: 'production',
        // Ensure line buffering by forcing TTY-like behavior
        ...(process.platform !== 'win32' ? { NODE_OPTIONS: '--unhandled-rejections=strict' } : {}),
        ...extraEnv,
      };

      // Spawn node with the tsx module and the script
      spawnfile = process.execPath; // node
      spawnargs = [tsxModulePath, absoluteScriptPath];
      child = spawn(spawnfile, spawnargs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      }) as ChildProcess;
    } catch (e) {
      // Synchronous spawn error
      const error = e as Error;
      logger.error({
        ID: id,
        step: 'child_spawn_sync_throw',
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        tsxPath: tsxModulePath,
        scriptPath: absoluteScriptPath,
        msg: 'Spawn threw synchronously'
      });
      (async () => {
        await updateRowAsFailure(id, supabase, 'dom_spawn_error', undefined);
        resolve({ ok: false, outcome: 'spawn_error' });
      })();
      return;
    }

    // Immediate check for PID
    if (child.pid === undefined) {
      logger.error({
        ID: id,
        step: 'child_spawn_no_pid',
        tsxPath: tsxModulePath,
        scriptPath: absoluteScriptPath,
        msg: 'Child process spawned but PID is undefined - spawn likely failed'
      }, 'Child process spawned but PID is undefined');
      // No need to set up event listeners or timeout
      (async () => {
        await updateRowAsFailure(id, supabase, 'dom_spawn_error', undefined);
        resolve({ ok: false, outcome: 'spawn_error' });
      })();
      return;
    }

    // Immediate spawn diagnostics
    logger.info({
      ID: id,
      step: 'child_spawned',
      pid: child.pid,
      spawnfile,
      spawnargs,
      childFingerprint
    }, 'Child process spawned');

    // 1-second delayed check (does NOT keep event loop alive) - debug only
    if (isDebug) {
      const oneSecondTimeout = setTimeout(() => {
        logger.info({
          ID: id,
          step: 'child_check_1s',
          pid: child.pid,
          killed: child.killed,
          msg: 'Child check after 1s'
        });
      }, 1000);
      oneSecondTimeout.unref();
    }

    let stdout = '';
    let stderr = '';
    let stdoutBuffer = ''; // Buffer for incomplete lines

    if (child.stdout) {
      child.stdout.on('data', (data: any) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Process lines for stage tracking
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split('\n');
        // Keep the last incomplete line in buffer
        stdoutBuffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('STAGE ')) {
            lastStage = trimmedLine.slice(6).trim(); // Remove "STAGE " prefix
            lastStageAt = new Date().toISOString();
            if (isDebug) {
              logger.debug({
                ID: id,
                step: 'stage_heartbeat',
                stage: lastStage,
                timestamp: lastStageAt
              }, 'Child stage heartbeat');
            }
          }
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });
    }

    let killAttempted = false;
    timeoutId = setTimeout(() => {
      if (finished) return;

      logger.warn({
        ID: id,
        step: 'child_process_timeout',
        timeout_ms: childTimeoutMs
      }, 'Child process timeout exceeded, killing process');

      killAttempted = true;

      // Kill process reliably on Windows
      if (process.platform === 'win32' && child.pid) {
        const killCmd = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
        killCmd.unref();
      } else if (child.pid) {
        process.kill(child.pid, 'SIGKILL');
      }

      finalizeOnce({ kind: 'timeout' });
    }, childTimeoutMs);

    child.on('close', (code: any) => {
      sawClose = true;
      const foundFingerprint = stdout.includes('CHILD_FINGERPRINT');
      const exitLog: any = {
        ID: id,
        step: 'child_process_exit',
        exit_code: code,
        stdout_length: stdout.length,
        stderr_length: stderr.length,
        pid: child.pid,
        childFingerprint,
        foundFingerprint
      };
      if (isDebug) {
        exitLog.stdout_preview = stdout.slice(0, 500);
        exitLog.stderr_preview = stderr.slice(0, 500);
      }
      logger.info(exitLog, 'Child process exited');

      if (code === 0) {
        logger.info({
          ID: id,
          step: 'child_process_success'
        }, 'Child process completed successfully');
      } else {
        const errorLog: any = {
          ID: id,
          step: 'child_process_error',
          exit_code: code
        };
        if (isDebug) {
          errorLog.stderr_preview = stderr.slice(0, 500); // Limited safe preview
        }
        logger.error(errorLog, 'Child process failed with non-zero exit code');
      }

      finalizeOnce({ kind: 'close', code });
    });

    child.on('error', (error: any) => {
      if (finished) return;

      logger.error({
        ID: id,
        step: 'child_process_spawn_error',
        errorMessage: error.message,
        errorCode: error.code,
        msg: 'Failed to spawn child process'
      }, 'Failed to spawn child process');

      finalizeOnce({ kind: 'error', err: error });
    });
  });
}

async function backfillRunner() {
  const supabase = createClient(supabaseUrl, serviceKey, {
    global: {
      fetch: fetchWithTimeout
    }
  });

  // Log configuration
  logger.info({
    step: 'runner_config',
    forceId,
    forceIds,
    forceOverwrite,
    batchSize,
    childTimeoutMs
  }, 'Runner configuration');

  // If FORCE_IDS is set, process only those IDs (overrides FORCE_ID)
  if (forceIds && forceIds.length > 0) {
    logger.info({
      step: 'force_ids_start',
      ids: forceIds,
      count: forceIds.length,
      child_timeout_ms: childTimeoutMs
    }, 'Processing forced IDs');

    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalTimedOut = 0;

    for (const id of forceIds) {
      totalProcessed++;
      logger.info({
        ID: id,
        step: 'processing_start',
        total_processed: totalProcessed,
        total_ids: forceIds.length
      }, `Processing article ${id} (${totalProcessed}/${forceIds.length})`);

      // Pass FORCE_OVERWRITE to child if set
      const extraEnv = forceOverwrite ? { FORCE_OVERWRITE: '1' } : undefined;
      const result = await runChildProcess(id, supabase, extraEnv);

      if (result.ok) {
        totalSucceeded++;
        logger.info({
          ID: id,
          step: 'processing_success',
          total_succeeded: totalSucceeded,
          total_failed: totalFailed,
          total_timed_out: totalTimedOut
        }, `Article ${id} processed successfully`);
      } else {
        if (result.outcome === 'timeout') {
          totalTimedOut++;
          logger.info({
            ID: id,
            step: 'processing_timeout',
            total_succeeded: totalSucceeded,
            total_failed: totalFailed,
            total_timed_out: totalTimedOut
          }, `Article ${id} timed out`);
        } else {
          totalFailed++;
          logger.info({
            ID: id,
            step: 'processing_failed',
            total_succeeded: totalSucceeded,
            total_failed: totalFailed,
            total_timed_out: totalTimedOut,
            outcome: result.outcome
          }, `Article ${id} failed (${result.outcome})`);
        }
      }
    }

    logger.info({
      step: 'force_ids_complete',
      total_processed: totalProcessed,
      total_succeeded: totalSucceeded,
      total_failed: totalFailed,
      total_timed_out: totalTimedOut
    }, 'Forced IDs processing completed');
    return;
  }

  // If FORCE_ID is set, process only that ID (single mode)
  if (forceId) {
    const { data, error } = await supabase
      .from('JazzItJog_db')
      .select('ID, "Article link"')
      .eq('ID', forceId)
      .single();

    if (error) {
      logger.error({ error: error.message, msg: 'Error fetching forced ID row' });
      return;
    }

    if (!data) {
      logger.error({ ID: forceId, msg: 'Forced ID not found' });
      return;
    }

    logger.info({
      step: 'force_id_start',
      ID: forceId,
      child_timeout_ms: childTimeoutMs
    }, 'Processing forced ID');

    // Pass FORCE_OVERWRITE to child if set
    const extraEnv = forceOverwrite ? { FORCE_OVERWRITE: '1' } : undefined;
    const result = await runChildProcess(forceId, supabase, extraEnv);
    if (result.ok) {
      logger.info({ ID: forceId, step: 'force_id_success' }, 'Forced ID processed successfully');
    } else {
      logger.info({ ID: forceId, step: 'force_id_failed', outcome: result.outcome }, 'Forced ID failed');
    }
    return;
  }

  // Batch processing for all rows with null specs_json (or all rows if forceOverwrite is true)
  let cursor = 0; // ID cursor for pagination
  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalTimedOut = 0;
  let batchNumber = 0;

  while (true) {
    batchNumber++;
    
    // Build query
    let query = supabase
      .from('JazzItJog_db')
      .select('ID, "Article link"')
      .not('"Article link"', 'is', null)
      .gt('ID', cursor) // Get IDs greater than cursor
      .order('ID', { ascending: true })
      .limit(batchSize);

    // If not forceOverwrite, only select rows with null specs_json
    if (!forceOverwrite) {
      query = query.is('specs_json', null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error: error.message, batch: batchNumber, msg: 'Error fetching batch' });
      break;
    }

    if (!data || data.length === 0) {
      logger.info({ 
        step: 'no_more_rows', 
        batch: batchNumber,
        total_batches: batchNumber - 1,
        total_processed: totalProcessed,
        total_succeeded: totalSucceeded,
        total_failed: totalFailed,
        total_timed_out: totalTimedOut
      }, 'No more rows to process');
      break;
    }

    const batchMinId = Math.min(...data.map(row => row.ID));
    const batchMaxId = Math.max(...data.map(row => row.ID));
    const nullLinkCount = data.filter(row => !row['Article link']).length;

    logger.info({
      step: 'batch_start',
      batch: batchNumber,
      batch_size: data.length,
      batch_min_id: batchMinId,
      batch_max_id: batchMaxId,
      null_link_count: nullLinkCount,
      total_processed_so_far: totalProcessed,
      child_timeout_ms: childTimeoutMs,
      forceOverwrite
    }, `Starting batch ${batchNumber} (IDs ${batchMinId}-${batchMaxId})`);

    let batchProcessed = 0;
    let batchSucceeded = 0;
    let batchFailed = 0;
    let batchTimedOut = 0;

    for (const row of data) {
      batchProcessed++;
      totalProcessed++;
      
      logger.info({
        ID: row.ID,
        step: 'processing_start',
        batch: batchNumber,
        batch_position: batchProcessed,
        batch_total: data.length,
        total_processed: totalProcessed
      }, `Processing article ${row.ID} (batch ${batchNumber}, ${batchProcessed}/${data.length})`);

      // Pass FORCE_OVERWRITE to child if set
      const extraEnv = forceOverwrite ? { FORCE_OVERWRITE: '1' } : undefined;
      const result = await runChildProcess(row.ID, supabase, extraEnv);

      if (result.ok) {
        batchSucceeded++;
        totalSucceeded++;
        logger.info({
          ID: row.ID,
          step: 'processing_success',
          batch: batchNumber,
          batch_succeeded: batchSucceeded,
          batch_failed: batchFailed,
          batch_timed_out: batchTimedOut
        }, `Article ${row.ID} processed successfully`);
      } else {
        if (result.outcome === 'timeout') {
          batchTimedOut++;
          totalTimedOut++;
          logger.info({
            ID: row.ID,
            step: 'processing_timeout',
            batch: batchNumber,
            batch_succeeded: batchSucceeded,
            batch_failed: batchFailed,
            batch_timed_out: batchTimedOut
          }, `Article ${row.ID} timed out`);
        } else {
          batchFailed++;
          totalFailed++;
          logger.info({
            ID: row.ID,
            step: 'processing_failed',
            batch: batchNumber,
            batch_succeeded: batchSucceeded,
            batch_failed: batchFailed,
            batch_timed_out: batchTimedOut,
            outcome: result.outcome
          }, `Article ${row.ID} failed (${result.outcome})`);
        }
      }

      // Update cursor to the last processed ID for pagination
      cursor = row.ID;
    }

    // Log batch completion
    logger.info({
      step: 'batch_complete',
      batch: batchNumber,
      batch_size: data.length,
      batch_processed: batchProcessed,
      batch_succeeded: batchSucceeded,
      batch_failed: batchFailed,
      batch_timed_out: batchTimedOut,
      batch_min_id: batchMinId,
      batch_max_id: batchMaxId,
      total_processed: totalProcessed,
      total_succeeded: totalSucceeded,
      total_failed: totalFailed,
      total_timed_out: totalTimedOut
    }, `Batch ${batchNumber} completed`);

    // Small delay between batches to avoid overwhelming the system
    if (data.length === batchSize) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final summary
  logger.info({
    step: 'runner_complete',
    total_batches: batchNumber - 1,
    total_processed: totalProcessed,
    total_succeeded: totalSucceeded,
    total_failed: totalFailed,
    total_timed_out: totalTimedOut
  }, 'Backfill runner completed all batches');
}

// Main execution
async function main() {
  // Strong fingerprint logs for runtime introspection
  const runnerFingerprint = Date.now().toString(36) + Math.random().toString(36).substring(2);
  if (isDebug) {
    console.log('RUNNER_FINGERPRINT', JSON.stringify({
      file: __filename,
      cwd: process.cwd(),
      argv: process.argv,
      pid: process.pid,
      time: new Date().toISOString(),
      fingerprint: runnerFingerprint,
      isCJS: typeof require !== 'undefined',
      hasModule: typeof module !== 'undefined',
      execPath: process.execPath,
      nodeVersion: process.version
    }));
  }

  // Log script startup details
  logger.info({ 
    cwd: process.cwd(), 
    node: process.version,
    FORCE_ID: process.env.FORCE_ID || null,
    BATCH_SIZE: batchSize,
    CHILD_TIMEOUT_MS: childTimeoutMs,
    DOM_PARSE_TIMEOUT_MS: process.env.DOM_PARSE_TIMEOUT_MS || '5000',
    SUPABASE_FETCH_TIMEOUT_MS: process.env.SUPABASE_FETCH_TIMEOUT_MS || '15000',
    runnerFingerprint
  }, 'Backfill runner script started');

  try {
    await backfillRunner();
  } catch (error) {
    console.error('Backfill runner script failed with error:', error);
    logger.error({ error: error instanceof Error ? error.message : String(error), msg: 'Backfill runner script failed' });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
