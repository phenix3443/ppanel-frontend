---
title: API 文档
outline: false
aside: false
---

# API 文档

本页通过 Scalar（以 iframe 嵌入方式）渲染本站 [`docs/public/swagger`](https://github.com/perfect-panel/frontend/tree/main/docs/public/swagger) 源码目录中的聚合 OpenAPI 文档。

后端 `master` 会将实际生成的 Swagger JSON 文件同步到本仓库。本页读取完整聚合文档，避免为不同服务重复维护多个 API Explorer。

<ClientOnly>
  <ScalarIframe spec-url="/swagger/ppanel.json" title="Perfect Panel API 文档" />
</ClientOnly>
