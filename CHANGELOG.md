# Changelog

## [0.5.0](https://github.com/leassis/curriculum-api/compare/curriculum-api-v0.4.0...curriculum-api-v0.5.0) (2026-11-27)


### Features

* **admin:** add the new chat autofill rule ([6406736](https://github.com/leassis/curriculum-api/commit/64067369d827164f305155357fe467d6c4c27027))
* **admin:** autofill the edit chat form from the chosen resume ([3728b5e](https://github.com/leassis/curriculum-api/commit/3728b5e0c94cbb967279112f8dbb2f0cb5430ede))
* **admin:** autofill the new chat form from the chosen resume ([b122396](https://github.com/leassis/curriculum-api/commit/b122396604bf6b84f2f8c9af622438a5b34323c1))
* **admin:** confirm every destructive action with a red button for deletes ([fc10483](https://github.com/leassis/curriculum-api/commit/fc10483c56486b327ffa5459f3b947d4483e6a81))
* **admin:** edit a recruiter chat from the chats page ([42708a8](https://github.com/leassis/curriculum-api/commit/42708a86b3812726df2036af6bdf771c2fbb8a4a))
* **admin:** put the resume select first in the chat form ([6595115](https://github.com/leassis/curriculum-api/commit/659511595c40069333ee69236e5cf204fa38237f))
* **admin:** render autofill fields and notices in the chat form ([2a93f87](https://github.com/leassis/curriculum-api/commit/2a93f87f99095bc3ff61aa7f474c6b95c9ef22d0))
* **admin:** render the chat form in edit mode ([35eb88a](https://github.com/leassis/curriculum-api/commit/35eb88a5b04ee6598056328b797e4d4690ddd4fa))
* **admin:** replace the browser confirm with a styled dialog ([b3f7024](https://github.com/leassis/curriculum-api/commit/b3f7024ba5bd740453104cd73010a2050fda1394))
* **admin:** save the short job description from resume options ([4f86782](https://github.com/leassis/curriculum-api/commit/4f86782150dcbdf97ec11cf30daea53803d84ab1))
* **admin:** show the short job description in the resume editor ([f78f0ff](https://github.com/leassis/curriculum-api/commit/f78f0ff23ef4ada6e777c7af8dc9f8fabdfcb809))
* **chats:** add a guarded recruiter chat update to the repository ([285c29f](https://github.com/leassis/curriculum-api/commit/285c29f866c232c201361fa75b2df303ba6c014d))
* **chats:** expose resume context to the admin ([f4a4d6a](https://github.com/leassis/curriculum-api/commit/f4a4d6ad64ed1b513a2173390ad7d19005dbc6ad))
* **chats:** read a tailored resume's company and short job description ([87b62cf](https://github.com/leassis/curriculum-api/commit/87b62cf0884a45ade8d6498d87b01cb968019e62))
* **chats:** update a recruiter chat in place ([85c8b23](https://github.com/leassis/curriculum-api/commit/85c8b23000bee6ca1440138750c1f095811c7965))
* **db:** add tailored_resumes.job_description_short ([4751150](https://github.com/leassis/curriculum-api/commit/4751150c53ca154172f8af207f46ecca5eb26432))
* **db:** make seed upsert the default prompts ([060df1e](https://github.com/leassis/curriculum-api/commit/060df1ef2b2e02978a05f31cffa131795ff0e318))
* **llm:** have the recruiter assistant lead with matches, not gaps ([8f4d1c6](https://github.com/leassis/curriculum-api/commit/8f4d1c620455eab3ba4f4dcf54c7de6cf6956aab))
* **resumes:** let the owner edit the company in resume options ([86a8246](https://github.com/leassis/curriculum-api/commit/86a8246d2a0f9404b9ad03f0776b36a606c14db0))
* **resumes:** let the owner edit the short job description ([282188b](https://github.com/leassis/curriculum-api/commit/282188bd046464063376d10b543ca2c1721a6e43))
* **resumes:** store the short job description on generation ([9b54e48](https://github.com/leassis/curriculum-api/commit/9b54e488ac1f0df9d16862d74fcea19a77a2cdb8))
* **tailor:** add short job description rules and normaliser ([f48f48f](https://github.com/leassis/curriculum-api/commit/f48f48f24f9de479fa1e9c9800ff59831db1ff18))
* **tailor:** carry the short job description through finish ([aa65c94](https://github.com/leassis/curriculum-api/commit/aa65c9434f3fa5904746f742efb4c04521d02685))
* **tailor:** request a short job description in the tailor output ([dc44992](https://github.com/leassis/curriculum-api/commit/dc44992e19e288750a843826f99398d563c1ce3f))


### Bug Fixes

* **admin:** import the resume context type from the service ([aa7a7e9](https://github.com/leassis/curriculum-api/commit/aa7a7e94d531c65368def9fa27e77b6fc0f0ebd4))
* **chats:** save an expired chat with its stored expiry ([c4453cc](https://github.com/leassis/curriculum-api/commit/c4453cc93c7c30cd7dc8247edd028a794abf4dd1))
* **llm:** answer recruiter fit questions instead of refusing them ([2bb1bd9](https://github.com/leassis/curriculum-api/commit/2bb1bd94939a64f8336d7cec3a1fc3eda1a827b1))
* **tailor:** pin the sentence end rule and prove the chat snapshot ([462a8c8](https://github.com/leassis/curriculum-api/commit/462a8c8f07fba7ea842050f097aab6cbe2baa676))

## [0.4.0](https://github.com/leassis/curriculum-api/compare/curriculum-api-v0.3.1...curriculum-api-v0.4.0) (2026-11-26)


### Features

* **admin:** add configurable favicon URL to admin pages ([8c202e9](https://github.com/leassis/curriculum-api/commit/8c202e94caa3d1965f7d5ca834c016c62f80e0d2))


### Bug Fixes

* **db:** make db:migrate and db:seed env files optional ([e494738](https://github.com/leassis/curriculum-api/commit/e494738e0b3305b114578017a1bb58983cefed3b))

## [0.3.1](https://github.com/leassis/curriculum-api/compare/curriculum-api-v0.3.0...curriculum-api-v0.3.1) (2026-11-25)


### Bug Fixes

* **test:** name Docker in every container start failure ([8faabd3](https://github.com/leassis/curriculum-api/commit/8faabd322f1bb38a4642684985fe952232434609))

## [0.3.0](https://github.com/leassis/curriculum-api/compare/curriculum-api-v0.2.0...curriculum-api-v0.3.0) (2026-11-24)


### Features

* **admin:** accept resume tracking fields on create and save ([4c97ed3](https://github.com/leassis/curriculum-api/commit/4c97ed393d6fb3ced009b33a4f7dcec97090255c))
* **admin:** add additional information and looking forward next to the profile ([36a307c](https://github.com/leassis/curriculum-api/commit/36a307c3f94109e99fccd8bdfa7115bfa2c71f99))
* **admin:** full-width chat list with bordered icon actions ([67adeb5](https://github.com/leassis/curriculum-api/commit/67adeb5cb49c57d026a6707b3cccd7b8fdcc6ae0))
* **admin:** show job link, recruiter name and notes on resumes ([6ead629](https://github.com/leassis/curriculum-api/commit/6ead6297fe2439f4a8ffc775b0120563090b6317))
* **career:** append profile sections to a career body ([2ceec0f](https://github.com/leassis/curriculum-api/commit/2ceec0fe5f7b073221cc89f4691802f6e08220ad))
* **chat:** send additional information and looking forward next to the public chat ([c73fcc2](https://github.com/leassis/curriculum-api/commit/c73fcc2dfdc249b32f4b384ffda20ebd1f334006))
* **chat:** send profile sections to recruiter chats ([3d8c571](https://github.com/leassis/curriculum-api/commit/3d8c57167022cad8045eab78fd52f4c347d87ea8))
* **db:** add owner notes columns to tailored_resumes and profile ([0fdcb55](https://github.com/leassis/curriculum-api/commit/0fdcb555b9e762a383ea9910d8073cd80f833916))
* **resumes:** persist tracking fields in the repository ([6c7364e](https://github.com/leassis/curriculum-api/commit/6c7364e897eb9c72f6721cd54be79ed68cdf7c8b))
* **resumes:** send additional information to the tailor ([1f7978e](https://github.com/leassis/curriculum-api/commit/1f7978e95e6565195645e575dc97a3afa33d0e8a))
* **resumes:** validate and save job link, recruiter name and notes ([991557e](https://github.com/leassis/curriculum-api/commit/991557e7cd43a048713b9b5e1e6727852701b5ba))


### Bug Fixes

* **career:** reject truncated CV imports ([9964396](https://github.com/leassis/curriculum-api/commit/99643966a176e06d37081219c672b065edf7a117))
* **design-system:** pin htmx with SRI ([0be53b2](https://github.com/leassis/curriculum-api/commit/0be53b2babca4f571e31be8a10e23c99e2bdf9cf))
* **resumes:** count tracking limits in characters and require http(s):// ([a4ce480](https://github.com/leassis/curriculum-api/commit/a4ce480106d2cc319f5f24b6119ebf00d12c80c1))
* **tailor:** report only experience items in left-out assessment ([5917483](https://github.com/leassis/curriculum-api/commit/5917483b26f1d2fb314716ace8df2b7f9f0b99f9))

## [0.2.0](https://github.com/leassis/curriculum-api/compare/curriculum-api-v0.1.0...curriculum-api-v0.2.0) (2026-11-24)


### ⚠ BREAKING CHANGES

* **db:** migration 0006 drops profile.master_cv and clears every tailored resume's structured document and model; resumes must be generated again from the career library.
* **db:** migration 0004 discards every generated resume text; existing resumes keep their rows and links and must be generated again.

### Features

* **admin:** add career cards and item form ([6adc7b8](https://github.com/leassis/curriculum-api/commit/6adc7b80cbe4eb206369aa6b0c8d236fccd17315))
* **admin:** choose the personal header on the new resume form ([b6f330a](https://github.com/leassis/curriculum-api/commit/b6f330a6f86ceeacd68a759cb0b1ae3715af8596))
* **admin:** edit tailored resumes with career cards ([cae87da](https://github.com/leassis/curriculum-api/commit/cae87dae110eb68b386029b34a64faa13e1bdc26))
* **admin:** edit the career library on the profile page ([4af787d](https://github.com/leassis/curriculum-api/commit/4af787db906aa1113c349f8132e0e2ee5b40033a))
* **admin:** generate on resume create ([785c489](https://github.com/leassis/curriculum-api/commit/785c4890b44756f72cfd92ed6021202110c24284))
* **admin:** pass the assessment to the resume editor ([5a2fac7](https://github.com/leassis/curriculum-api/commit/5a2fac739e25e5c818455e400a9ad38c0485025b))
* **admin:** render the resume document as an edit form ([9bbbfa3](https://github.com/leassis/curriculum-api/commit/9bbbfa391fbdbfa28a5fbdccf98bc006d0af1cc7))
* **admin:** rework admin shell, add toasts, recruiter test chat and chat counts ([f7e11b2](https://github.com/leassis/curriculum-api/commit/f7e11b28999d0a2aa458aa57507d673e0cd7f3e8))
* **admin:** save, reorder and preview the resume document ([b257b2e](https://github.com/leassis/curriculum-api/commit/b257b2ec9be78b11b78c4f0a05c20569f5059c25))
* **admin:** set the import model in settings ([9548369](https://github.com/leassis/curriculum-api/commit/9548369f46215ff4245d4a53498d4f422ef17f7c))
* **admin:** show create-time generation errors in the editor ([82dea74](https://github.com/leassis/curriculum-api/commit/82dea74d5f781e8962412744ec42dce480689f67))
* **admin:** show left out items on tailored resume cards ([13193ca](https://github.com/leassis/curriculum-api/commit/13193ca272ec7f522c9ed708745c683031f5f7a5))
* **admin:** show the resume assessment panels ([bdb144c](https://github.com/leassis/curriculum-api/commit/bdb144c3d5bdcf7a5d7b24f48e0a885a188f2e81))
* build curriculum API with public chat, recruiter chat, tailored resumes and admin ([5b39cf0](https://github.com/leassis/curriculum-api/commit/5b39cf00ec3d70c0639813de92349b1c04e8dba2))
* **career:** add CareerService item operations ([c1c7734](https://github.com/leassis/curriculum-api/commit/c1c7734a274808de0083d4609ebc73bfd685c04f))
* **career:** add pure add, replace, move and remove ([ee3fe4a](https://github.com/leassis/curriculum-api/commit/ee3fe4ab4904131e57ea87583bd4aa1643aa190f))
* **career:** add the Career Item schema and kinds ([42eb1c6](https://github.com/leassis/curriculum-api/commit/42eb1c6e422e16663ecfa85fa751a8e0ca5baf01))
* **career:** add the career library repository ([26b52da](https://github.com/leassis/curriculum-api/commit/26b52da8c92a4f56a9710524a7014d8b64aa3ee8))
* **career:** format dates and meta lines per kind ([c88c2c9](https://github.com/leassis/curriculum-api/commit/c88c2c9b5628f654a76a0f77bfbacf9b8341dd50))
* **career:** map item forms to Career Items and back ([2c91f88](https://github.com/leassis/curriculum-api/commit/2c91f8872880cc4f380e070265be7ff4f091dca5))
* **career:** parse library markdown deterministically ([1d1b6d5](https://github.com/leassis/curriculum-api/commit/1d1b6d58e1eb60ab21c65af726d15797db7edcdc))
* **career:** render the Career Body from items ([827c6e2](https://github.com/leassis/curriculum-api/commit/827c6e2b3affb8ca702639d2ef76a656e0e6da6b))
* **career:** render the library as markdown ([beb0993](https://github.com/leassis/curriculum-api/commit/beb0993a9a8603979ae1c22a6b0a611322694ba6))
* **career:** save library markdown and import pasted text ([7a71725](https://github.com/leassis/curriculum-api/commit/7a717252eb94eeadd8bfe9dd5a2a17b026bd463c))
* **chats:** send the Career Body rendered from items ([fc20035](https://github.com/leassis/curriculum-api/commit/fc20035d13045c59a2244ee05e82e262da7a41d7))
* **db:** add career_library and profile summary ([7af692c](https://github.com/leassis/curriculum-api/commit/7af692ccb7bed1ef35878b40644c95f8c0d44e67))
* **db:** add structured jsonb to tailored_resumes ([0126689](https://github.com/leassis/curriculum-api/commit/012668914ee90c46dc43d5f35d1b18ab1596d15a))
* **db:** drop markdown content from tailored_resumes ([53d07b3](https://github.com/leassis/curriculum-api/commit/53d07b396d157e588631ba0a20589cf87313eff3))
* **db:** drop the markdown master CV ([27bc459](https://github.com/leassis/curriculum-api/commit/27bc459e42e947ac1d92a2c734b54dd0aa90ebad))
* **db:** store the resume assessment ([6983113](https://github.com/leassis/curriculum-api/commit/69831131d5bceb95883eaf1c6bfe918979c71ae9))
* **llm:** add configurable sampling temperature per area ([2935d79](https://github.com/leassis/curriculum-api/commit/2935d79e608ada03b4020a8b571a0a4c80eec7d8))
* **llm:** add structured generateObject to LlmService ([4c6aedf](https://github.com/leassis/curriculum-api/commit/4c6aedf72508a4a81b08f99df35d58fa3c238f0a))
* **llm:** add structured-output settings to the OpenRouter factory ([c91369f](https://github.com/leassis/curriculum-api/commit/c91369f2cebbed39de838ebdfd27b306101a8fe5))
* **llm:** add the fixed import prompt ([f515029](https://github.com/leassis/curriculum-api/commit/f515029b26a9d97e5960202071c0d3e7c80d8de4))
* **recruiter:** send the linked resume document as career body ([2dbeff0](https://github.com/leassis/curriculum-api/commit/2dbeff03be841b6a9ede4521d8ad8013a841f9e7))
* **repositories:** read and write the resume document ([c176e3c](https://github.com/leassis/curriculum-api/commit/c176e3c78b27fce76c3ba43f34f8001c92a9835b))
* **resumes:** add back career items left out of a tailored resume ([a957dbf](https://github.com/leassis/curriculum-api/commit/a957dbf79bbd67baeb91b1a195a921a9d99499fb))
* **resumes:** create and generate in one service call ([170f7a0](https://github.com/leassis/curriculum-api/commit/170f7a02edbad56bcbf1f8e909152a9eb510757d))
* **resumes:** delimit custom instructions in the tailor input ([1c06348](https://github.com/leassis/curriculum-api/commit/1c063481104db2d0ba89c355a8a6b59478d9c146))
* **resumes:** edit tailored items without touching the library ([5267c0a](https://github.com/leassis/curriculum-api/commit/5267c0a3d6fdb3fbc117d1191c1af8071ffad130))
* **resumes:** generate a structured resume with one retry ([390e9cf](https://github.com/leassis/curriculum-api/commit/390e9cff77d4b69d19fca217be472b1093dcf3fa))
* **resumes:** generate v2 documents from the career library ([3e1caf6](https://github.com/leassis/curriculum-api/commit/3e1caf6c6ab312f7bf583bb8516a8a8dd1e7ec92))
* **resumes:** parse the stored document on read ([e81665d](https://github.com/leassis/curriculum-api/commit/e81665d61c31f9e6bd4be903cec672a6cc3fe5b2))
* **resumes:** print and download v2 documents ([82115d8](https://github.com/leassis/curriculum-api/commit/82115d865f53978da1c084613c936ecf96c94f89))
* **resumes:** render print and download from the document ([8b7f4e3](https://github.com/leassis/curriculum-api/commit/8b7f4e346bbf1c47e2613d5d27458892ae4efc98))
* **resumes:** save and edit the resume document ([35c502e](https://github.com/leassis/curriculum-api/commit/35c502ec1cdf33fefa7a5fed2d5588e947cfa238))
* **resumes:** store the personal header chosen on create ([fe374e7](https://github.com/leassis/curriculum-api/commit/fe374e72f55da2ba90104b76bbefad31fc030965))
* **resumes:** store the score, gaps and omissions on generate ([a0cc229](https://github.com/leassis/curriculum-api/commit/a0cc22939ef9e459d94f907bcdd1280e691a1f13))
* **scripts:** add the real-model tailor check ([f5684e0](https://github.com/leassis/curriculum-api/commit/f5684e0ad8fa1bd85e9bc69549a75b89a9909b86))
* **settings:** add the import model area ([f3e50e9](https://github.com/leassis/curriculum-api/commit/f3e50e9fbe117b30d46443339cc682aa68b13228))
* **tailor:** add the model-facing output schema ([cafedb4](https://github.com/leassis/curriculum-api/commit/cafedb45feb27f46cbf432e9d0e8738582b437c8))
* **tailor:** add the Resume Document zod schema ([fb00f87](https://github.com/leassis/curriculum-api/commit/fb00f87163a7a95926a0ab7f0f1c339b7321c4cf))
* **tailor:** add the score rubric and assessment rules ([f140430](https://github.com/leassis/curriculum-api/commit/f14043092a6890a03bbef61516db988875b35b3d))
* **tailor:** ask the model for score, gaps and omissions ([d4533b8](https://github.com/leassis/curriculum-api/commit/d4533b8e126b997038fe8d75bac0c614c8cd2bc0))
* **tailor:** assemble a Resume Document with code-owned headings ([b3048ee](https://github.com/leassis/curriculum-api/commit/b3048ee0fe38a7ad7b4849afe87b52a4a881f1b6))
* **tailor:** assemble v2 documents from library items ([5558094](https://github.com/leassis/curriculum-api/commit/5558094232ec62370a5abb2a96ae9a1b8bb342f0))
* **tailor:** build documents from the editor form and apply item ops ([9ada9ac](https://github.com/leassis/curriculum-api/commit/9ada9ac9a968c8794a8243380c545db8ed9934a3))
* **tailor:** define Resume Document v2 ([8606edf](https://github.com/leassis/curriculum-api/commit/8606edf32a5230d2d73b9c4fbc8ba35cbec3e352))
* **tailor:** filter missing skills and bound the assessment ([39c8699](https://github.com/leassis/curriculum-api/commit/39c8699f18d20e2cb7e994116bfd44f7c3948052))
* **tailor:** finish model output into a document and assessment ([9e6f639](https://github.com/leassis/curriculum-api/commit/9e6f6399307530df277ba939e8120c37d10cc19d))
* **tailor:** parse the Master CV into sections and items ([b15057e](https://github.com/leassis/curriculum-api/commit/b15057e0a194bc58385f2ef1995cf08a18d52322))
* **tailor:** render a Resume Document to markdown ([3c022f1](https://github.com/leassis/curriculum-api/commit/3c022f1e9f7ee6579a0cdb528e6e57a3a18f0549))
* **tailor:** shorten roles that ended more than 15 years ago ([d6797e7](https://github.com/leassis/curriculum-api/commit/d6797e7c6982ad59c903d88fa712f2ba13fdfe16))
* **tailor:** v2 output schema with per-call item ids ([943aba4](https://github.com/leassis/curriculum-api/commit/943aba4a95dd70e3c9525eca17a451d924888e41))


### Bug Fixes

* **admin:** draw the ongoing box as a round control with a muted label ([d1b332a](https://github.com/leassis/curriculum-api/commit/d1b332a0514c9a0ac54de3f3ae17b33b18e40a10))
* **admin:** look up create errors by own property ([d131c59](https://github.com/leassis/curriculum-api/commit/d131c59e68d263fd44ee0d73f91181c261675d24))
* **admin:** show create-time generation errors in red ([316e17d](https://github.com/leassis/curriculum-api/commit/316e17d1c988c558717da344077c769d079a19d5))
* **career:** reject an organisation or location that reads as a date ([7d20974](https://github.com/leassis/curriculum-api/commit/7d20974e7203c8b7fd798c048097baeea2d120f8))
* **db:** add pool timeouts, guard test resets, print migrate target ([18c003b](https://github.com/leassis/curriculum-api/commit/18c003b73626148065584ec09db860baa5aa5bad))
* **db:** use client-side query_timeout, PgBouncer rejects statement_timeout ([a3529d7](https://github.com/leassis/curriculum-api/commit/a3529d7a550d9a96ceaa7f839d6e81713d7778cd))
* **repositories:** accept headerFields on resume insert ([f357ab1](https://github.com/leassis/curriculum-api/commit/f357ab140e2115af488681fba4984f107dfea0ff))
* **resumes:** answer 503 when generation fails twice ([d9ca09d](https://github.com/leassis/curriculum-api/commit/d9ca09d1250f5a2a2ab886ba38a275320b9819a5))
* **resumes:** answer a clear message at the 200-item resume limit ([6d9910a](https://github.com/leassis/curriculum-api/commit/6d9910a5478e9b00d34500c7c258fa7e436351f5))
* **resumes:** ask the model to keep and rank every resume section ([6f08c2d](https://github.com/leassis/curriculum-api/commit/6f08c2ddc01bffa5ad1307e043a0ebd048964051))
* **resumes:** lock the resume row while a change is read and written ([893cebd](https://github.com/leassis/curriculum-api/commit/893cebde273f47bfacbf50d9af86e92fe7c9abb1))
* **resumes:** read Personal Info and the profile before locking the resume row ([d05acda](https://github.com/leassis/curriculum-api/commit/d05acda5a283bedc52ac189b2c42ee42bdfeb193))
* **resumes:** reject a master cv that contains the full name ([6831f74](https://github.com/leassis/curriculum-api/commit/6831f748ae4e475f9b8ea85b37aee2fa27758813))
* **resumes:** reject empty or too long cv headings before generating ([c0703d7](https://github.com/leassis/curriculum-api/commit/c0703d7ddf6edfac85754edb651cd7cb1b0b2a04))
* **resumes:** restore omitted certifications, courses, skills and languages ([ca2e9bf](https://github.com/leassis/curriculum-api/commit/ca2e9bfcb69b44cb34a54d4dbc18a8fa58f67366))
* **scripts:** load .env.local in verify:tailor ([2870fed](https://github.com/leassis/curriculum-api/commit/2870fed804761e7753a1075f091550292aee1c1f))
* **tailor:** apply form ops to the clicked item after empty sections ([4149394](https://github.com/leassis/curriculum-api/commit/41493945624d91f00bb0325ab2e866a1ea73bc37))
* **tailor:** strip prefixes on every line and flatten headings and bullets ([9a542c7](https://github.com/leassis/curriculum-api/commit/9a542c78c653595794d2d736e6115934dcc7bab0))

## 0.1.0 (2026-11-22)


### Features

* build curriculum API with public chat, recruiter chat, tailored resumes and admin ([5b39cf0](https://github.com/leassis/curriculum-api/commit/5b39cf00ec3d70c0639813de92349b1c04e8dba2))
