---
title: API Reference
outline: false
aside: false
---

# API Reference

The API reference uses Scalar (embedded via iframe) to render the aggregate OpenAPI document served from this site's [`docs/public/swagger`](https://github.com/perfect-panel/frontend/tree/main/docs/public/swagger) source directory.

Backend `master` publishes its generated Swagger JSON files to this repository. This page loads the complete aggregate spec so the explorer stays in one place instead of splitting services across separate explorers.

<ClientOnly>
  <ScalarIframe spec-url="/swagger/ppanel.json" title="Perfect Panel API Reference" />
</ClientOnly>
