// Shell: help [command] | ? | clear — handled by the interface; the engine only signals them.
export const help = {
  name: 'help',
  readOnly: true,
  run(ctx) {
    ctx.emit('ui', { action: 'help', topic: ctx.args[0] || null });
    ctx.output({ kind: 'help', topic: ctx.args[0] || null });
  },
};

export const clear = {
  name: 'clear',
  readOnly: true,
  run(ctx) {
    ctx.emit('ui', { action: 'clear' });
  },
};

export default help;
