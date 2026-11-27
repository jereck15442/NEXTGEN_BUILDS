const o="http://www.w3.org/2000/svg";function c(h){return String(h).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function a(h){const e=String(h||"").trim().split(/\s+/).filter(Boolean);if(e.length===0)return"PC";const r=e[0].charAt(0),i=e[1]?e[1].charAt(0):"";return(r+i).toUpperCase()}const t='fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"',n={CPU:`
    <g ${t}>
      <rect x="95" y="95" width="110" height="110" rx="12" />
      <rect x="120" y="120" width="60" height="60" rx="6" />
      <path d="M95 120H75M95 150H75M95 180H75M225 120h20M225 150h20M225 180h20M120 95V75M150 95V75M180 95V75M120 225v-20M150 225v-20M180 225v-20" />
    </g>`,motherboard:`
    <g ${t}>
      <rect x="70" y="60" width="160" height="180" rx="8" />
      <rect x="95" y="85" width="55" height="55" rx="4" />
      <path d="M165 85h40v25h-40zM165 125h40M165 145h40M165 165h40M95 160h55M95 180h55" />
      <circle cx="110" cy="215" r="8" />
    </g>`,GPU:`
    <g ${t}>
      <rect x="55" y="105" width="190" height="90" rx="8" />
      <circle cx="105" cy="150" r="25" />
      <circle cx="195" cy="150" r="25" />
      <circle cx="105" cy="150" r="4" />
      <circle cx="195" cy="150" r="4" />
      <path d="M245 120h18v60h-18M55 195v20h30" />
    </g>`,RAM:`
    <g ${t}>
      <rect x="95" y="80" width="35" height="140" rx="4" />
      <rect x="170" y="80" width="35" height="140" rx="4" />
      <path d="M95 100h35M95 115h35M95 130h35M95 145h35M95 160h35M95 175h35M170 100h35M170 115h35M170 130h35M170 145h35M170 160h35M170 175h35" />
      <path d="M102 220h21M177 220h21" />
    </g>`,storage:`
    <g ${t}>
      <rect x="70" y="105" width="160" height="90" rx="10" />
      <circle cx="210" cy="150" r="18" />
      <path d="M95 135h70M95 155h50M95 175h30" />
    </g>`,PSU:`
    <g ${t}>
      <rect x="70" y="90" width="160" height="120" rx="8" />
      <circle cx="150" cy="150" r="35" />
      <path d="M150 115v70M115 150h70" opacity="0.5" />
      <path d="M230 120h25v20h-25M230 170h25v20h-25" />
    </g>`,case:`
    <g ${t}>
      <rect x="95" y="60" width="110" height="180" rx="8" />
      <circle cx="150" cy="95" r="10" />
      <path d="M120 130h60M120 150h60M120 170h60M120 190h60" />
    </g>`,default:`
    <g ${t}>
      <rect x="85" y="85" width="130" height="130" rx="10" />
      <path d="M85 125h130M85 165h130M125 85v130M165 85v130" />
    </g>`};function M(h,e){const r=n[e]||n.default,i=c(a(h)),s=c(String(e||"Component").toUpperCase()),g=`<svg xmlns="${o}" width="300" height="300" viewBox="0 0 300 300"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#1e293b" stroke-width="1" /></pattern></defs><rect width="300" height="300" fill="#0f172a" /><rect width="300" height="300" fill="url(#grid)" opacity="0.55" /><text x="24" y="42" fill="#94a3b8" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">${i}</text>`+r+`<text x="150" y="262" fill="#64748b" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" letter-spacing="3" text-anchor="middle">${s}</text></svg>`;return`data:image/svg+xml,${encodeURIComponent(g)}`}export{M as p};
//# sourceMappingURL=placeholder-CULqmeyf.js.map
