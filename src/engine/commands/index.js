// Command registry. One handler per file: { name, aliases?, readOnly?, run(ctx) }.
// To add a command: create commands/<name>.js and add it to this list (or call registerCommand from apply.js).
import status from './status.js';
import add from './add.js';
import commit from './commit.js';
import restore from './restore.js';
import rm from './rm.js';
import stash from './stash.js';
import branch from './branch.js';
import switchCmd from './switch.js';
import checkout from './checkout.js';
import merge from './merge.js';
import rebase from './rebase.js';
import cherryPick from './cherry-pick.js';
import reset from './reset.js';
import revert from './revert.js';
import worktree from './worktree.js';
import diff from './diff.js';
import log from './log.js';
import blame from './blame.js';
import show from './show.js';
import touch from './touch.js';
import create from './create.js';
import resolve from './resolve.js';
import click from './click.js';
import cd from './cd.js';
import ls from './ls.js';
import { help, clear } from './help.js';
import fetch from './fetch.js';
import pull from './pull.js';
import push from './push.js';
import remote from './remote.js';
import init from './init.js';
import gh from './gh.js';
import fork from './fork.js';
import mr from './mr.js';
import colleague from './colleague.js';
import { publish, onlineOnlyCmd } from './publish.js';
import { aiCommand, assistantCommand, aiMrCommand } from '../ai.js';

export const COMMANDS = [
  status, add, commit, restore, rm, stash, branch, switchCmd, checkout, merge, rebase, cherryPick,
  reset, revert, worktree, diff, log, blame, show, touch, create, resolve, click, cd, ls, help, clear,
  // remote.js / ai.js layer
  init, gh, fetch, pull, push, remote, fork, mr, colleague, publish, onlineOnlyCmd, aiCommand, assistantCommand, aiMrCommand,
];
