// Usage: node check-links.js   (run on your own computer; Node 18+)
// Checks every external link in index.html and prints the ones that fail.
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const urls=[...new Set([...html.matchAll(/href="(https?:\/\/[^"#]+)/g)].map(m=>m[1]))];
(async()=>{let bad=0;for(const u of urls){try{const r=await fetch(u,{method:'GET',redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 link-check'}});if(r.status>=400){bad++;console.log(r.status,u)}}catch(e){bad++;console.log('ERR',u)}}
console.log(urls.length+' links checked, '+bad+' problems. Some sites block scripts, so recheck by hand.')})();
