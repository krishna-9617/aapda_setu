const fs = require('fs');
let c = fs.readFileSync('src/components/ui/compare.jsx', 'utf-8');
c = c.replace(/<img[^>]*alt="first image"[^>]*\/>/g, '{typeof firstImage === "string" ? <img alt="first image" src={firstImage} className={cn("absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none", firstImageClassName)} draggable={false} /> : <div className={cn("absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none", firstImageClassName)}>{firstImage}</div>}');
c = c.replace(/<img[^>]*alt="second image"[^>]*\/>/g, '{typeof secondImage === "string" ? <img alt="second image" src={secondImage} className={cn("absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none", secondImageClassname)} draggable={false} /> : <div className={cn("absolute inset-0 z-20 rounded-2xl shrink-0 w-full h-full select-none", secondImageClassname)}>{secondImage}</div>}');
fs.writeFileSync('src/components/ui/compare.jsx', c);
