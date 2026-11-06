import { spawn } from 'node:child_process';
const args=process.argv.slice(2);const portArg=args.indexOf('--port');const port=portArg>=0?args[portArg+1]:process.env.PORT||'3000';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','0.0.0.0','--port',port,'--inspector-port','0'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));child.on('exit',code=>process.exit(code??0));
