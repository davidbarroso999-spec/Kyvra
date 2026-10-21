/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-a1974cce'], (function (workbox) { 'use strict';

  importScripts("/sw-custom.js");
  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-custom.js",
    "revision": "232a309c8a8e2e893f987aea78dd2514"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4a0cd0d0c2e8ec82876434b854f04a63"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4a0cd0d0c2e8ec82876434b854f04a63"
  }, {
    "url": "index.html",
    "revision": "066ad28da760c7e3514ee1f9a72a7600"
  }, {
    "url": "assets/workbox-window.prod.es5-BIl4cyR9.js",
    "revision": null
  }, {
    "url": "assets/search-De622Vu5.js",
    "revision": null
  }, {
    "url": "assets/index-D6ce3PVb.js",
    "revision": null
  }, {
    "url": "assets/index-Btf4bXYM.css",
    "revision": null
  }, {
    "url": "assets/eye-D5dfiiY7.js",
    "revision": null
  }, {
    "url": "assets/check-BEP3dykD.js",
    "revision": null
  }, {
    "url": "assets/book-open-B2riH38n.js",
    "revision": null
  }, {
    "url": "assets/TrackDuration-zEh5cam6.js",
    "revision": null
  }, {
    "url": "assets/Lore-BYIymo1A.js",
    "revision": null
  }, {
    "url": "assets/Home-D7TJV3lb.js",
    "revision": null
  }, {
    "url": "assets/Archive-DrtyFI5i.js",
    "revision": null
  }, {
    "url": "assets/Albums-COauH_1J.js",
    "revision": null
  }, {
    "url": "assets/AlbumDetail-CnjTbuqT.js",
    "revision": null
  }, {
    "url": "assets/Admin-C7zgGSia.js",
    "revision": null
  }, {
    "url": "manifest.webmanifest",
    "revision": "07379a2b4d300da51dfe2c0812f46b9b"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i, new workbox.NetworkFirst({
    "cacheName": "supabase-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
