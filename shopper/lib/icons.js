const paths={
 shop:'M3 10h18M5 10v10h14V10M3 10l2-7h14l2 7M9 20v-6h6v6',
 scan:'M8 3H4v4M16 3h4v4M4 17v4h4M20 17v4h-4M7 8v8M10 8v8M14 8v8M17 8v8M2 12h20',
 cart:'M3 4h2l3 12h10l3-9H6M10 20h.01M18 20h.01',
 savings:'M12 3l2.8 5.7L21 10l-4.5 4.4 1 6.3L12 17.8l-5.5 2.9 1-6.3L3 10l6.2-1.3L12 3M9 11l2 2 4-4',
 lists:'M8 4h12v17H4V4h4M8 2h8v4H8zM8 10h8M8 14h8M8 18h5',
 trips:'M3 12a9 9 0 1 0 2-6M3 3v6h6M12 7v5l3 2',
 ask:'M21 11a8 8 0 0 1-8 8H7l-4 3V6a3 3 0 0 1 3-3h7a8 8 0 0 1 8 8M8 9h8M8 13h5',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 3 3 1 3 2-2 3v3l2 3-3 2-3 1-1 3h-4l-1-3-3-1-3-2 2-3v-3L3 8l3-2 3-1z',
 search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M16 16l5 5',
 plus:'M12 5v14M5 12h14',minus:'M5 12h14',close:'M6 6l12 12M18 6L6 18',arrow:'M5 12h14M14 7l5 5-5 5',down:'M6 9l6 6 6-6',check:'M5 12l4 4L19 6',
 leaf:'M20 3C10 2 3 8 5 16c7 4 16-3 15-13M5 21L17 7',
 warning:'M12 3L2 21h20L12 3M12 9v5M12 17h.01',info:'M12 16v-5M12 7h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
 wifi:'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
 offline:'M3 3l18 18M2 8a16 16 0 0 1 3-2M9 4a16 16 0 0 1 13 4M5 12a11 11 0 0 1 4-2M14 10a11 11 0 0 1 5 2M8.5 16a5 5 0 0 1 7 0M12 20h.01',
 moon:'M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1',
 download:'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',share:'M8 12l8-6M8 12l8 6M5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',lock:'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5zM12 15v3',
 bag:'M5 7h14l2 14H3L5 7M8 8V6a4 4 0 0 1 8 0v2',grain:'M12 21V5M12 16C4 16 4 10 4 10c8 0 8 6 8 6M12 12c8 0 8-6 8-6-8 0-8 6-8 6M12 6c-4-4 0-6 0-6s4 2 0 6',
 bottle:'M10 2h4v4l3 5v10H7V11l3-5V2M7 13h10',milk:'M7 3h10l3 5v13H4V8l3-5M7 3v5h13M12 8v13',
 snack:'M5 3l3 2 4-2 4 2 3-2v18l-3-2-4 2-4-2-3 2V3M9 9h6M9 13h6',home:'M3 11l9-8 9 8M5 9v12h14V9M9 21v-8h6v8',
 heart:'M12 21L3 12C-2 4 8-1 12 6c4-7 14-2 9 6l-9 9',spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7',torch:'M9 2h6l3 6-4 4v10h-4V12L6 8l3-6M7 7h10',
 logout:'M10 4H4v16h6M9 12h12M17 8l4 4-4 4',chevron:'M9 5l7 7-7 7'
};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.bag}"/></svg>`;}
export function categoryIcon(category=''){if(/BEVER|DRINK/i.test(category))return 'bottle';if(/MILK|DAIRY/i.test(category))return 'milk';if(/SNACK|BAKERY/i.test(category))return 'snack';if(/RICE|STAPLE|CEREAL|BAKING/i.test(category))return 'grain';if(/FRESH|FROZEN/i.test(category))return 'leaf';if(/CARE|COSMETIC/i.test(category))return 'heart';if(/HOUSE|KITCHEN|HOME/i.test(category))return 'home';return 'bag';}
export const basketArt=`<svg class="basket-art" viewBox="0 0 260 220" fill="none" aria-hidden="true"><circle cx="139" cy="100" r="88" fill="#e4edd8"/><circle cx="218" cy="41" r="20" fill="#eccb85"/><path d="M75 114L49 68c-14-25 16-39 29-16l32 57" fill="#dca668"/><path d="M58 62l16-9M65 77l16-9M73 92l16-9" stroke="#b47d45" stroke-width="3"/><path d="M160 102c-13-27-8-57 4-74 11 19 12 34 4 58 7-21 19-30 37-35-2 26-19 41-38 49" fill="#337b4d"/><path d="M157 58l11 48" stroke="#f5faf0" stroke-width="2"/><path d="M114 100V54h33v57" fill="#faf5df" stroke="#8aaca1" stroke-width="2"/><path d="M114 54l8-16h25v16" fill="#b9d5c7"/><path d="M122 38v16h25M122 70h17" stroke="#6d9a84" stroke-width="3"/><path d="M67 102h142l-15 88H81l-14-88Z" fill="#a5be72"/><path d="M67 102h142l-5 22H72l-5-22Z" fill="#b6cb86"/><path d="M95 103l26-38a12 12 0 0 1 20 0l28 38" stroke="#1d6950" stroke-width="9" stroke-linecap="round"/><path d="M96 136l5 36M122 136l2 36M150 136l-2 36M177 136l-5 36" stroke="#6c8b43" stroke-width="5" stroke-linecap="round"/><path d="M54 192c42 10 107 14 158 0" stroke="#c9d7bc" stroke-width="3" stroke-linecap="round"/><path d="M36 125v14M29 132h14M222 145v10M217 150h10" stroke="#9aa877" stroke-width="2"/></svg>`;
