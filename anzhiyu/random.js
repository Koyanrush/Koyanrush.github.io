var posts=["2026/01/11/Jindun2025/","2026/02/02/CTFShowmisc1/","2026/03/23/Software-System-Security-2026/","2026/02/03/Moectfpwn1/","2026/01/01/2026-new-year/","2026/03/06/course-grabber/","2025/12/30/first-blog/","2025/12/28/hello-world/","2026/08/11/moectf2026/","2026/07/06/我是如何进入agent时代的/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };