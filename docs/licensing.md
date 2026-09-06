# APW licensing transition / 商业授权切换

## Boundary / 切换边界

From the first APW 0.7.0 distribution carrying the new root `LICENSE`, original new material is offered under **APW Proprietary License 1.0**, not MIT. This is a source-visible proprietary license, not an open-source license, government certificate, software registration, or payment system.

The historical MIT baseline is commit `71ab2a080d2ccd9df2b75741eae81e3fe0f3d2fd` (package version `0.6.7`). Its original copyright and full terms remain in [`licenses/MIT-legacy.txt`](../licenses/MIT-legacy.txt). Earlier MIT grants remain effective for that material, including unchanged portions inside later releases. Someone may still obtain that baseline from Git history and exercise its MIT permissions. A new version number does not make that existing code exclusive.

从本次 0.7.0 授权切换起，后续首次以新许可发布的原创新增内容采用专有许可。旧 MIT 版本及后来版本沿用的同一部分代码，其既有许可不收回。本次不删除历史、不改写旧提交，也不能把已有 MIT 代码重新变成独占资产。

## Permissions / 使用边界

The root [LICENSE](../LICENSE) is controlling. It allows private non-production evaluation and personal non-commercial evaluation of the unmodified official web build. Production, internal professional/client work, distribution, modifications and competing hosting based on covered new material require separate written permission, except where an earlier license, third-party license, law or GitHub platform right already permits the action.

你本人作为权利人，对自己控制的内容仍可免费用于个人和专业工作。此改动不建立付费账号、激活码、限额、订阅、云端数据上传或收费按钮。其他使用者可免费个人评估；新受限内容的生产／商业使用、转售或自建服务需书面授权。已有 MIT 权利和第三方权利除外。

GitHub public-repository viewing/forking rights are expressly preserved. Keeping a public repository does not hide source or browser-delivered JavaScript. This legal boundary is not technical copy protection. No user data, user-authored templates, backups or generated reports become the Licensor's property.

## Repository and hosting / 仓库与线上版

The repository stays public. GitHub plan, Pages configuration, URL/origin, DNS, workflows and application behavior are unchanged. `package.json` uses `SEE LICENSE IN LICENSE` and `private: true`; npm's private flag prevents accidental package publication and does **not** make the GitHub repository private. Existing browser data remains at the same origin. No re-import or browser-data clearing is required.

A proprietary license does not itself create a Pages fee or grant permission for commercial SaaS hosting. Before selling a hosted service, review the host's then-current terms and choose appropriate commercial hosting. This change is not a paid-service launch or a guarantee of free hosting forever.

## Third-party and contribution review / 第三方与贡献

The pre-transition clone's reachable history lists `finn`, `finnlyu41-tech` and `APW automation` as author identities, with a `finnlyu41-tech` co-author trailer. This is a repository-history check, **not proof of sole legal ownership**, employment rights, originality or every generated snippet's provenance. No blanket assignment of contributors' rights is made. Earlier contributions remain within the preserved MIT grant.

Current production package licenses were checked in the frozen-lockfile installation: React, React DOM and Scheduler (MIT), and Lucide (ISC plus the included Feather-derived MIT notice). See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). This is not a complete legal opinion or security audit. Development tools remain separately licensed. Obtain clear written contribution terms before merging future external code; do not assume a PR transfers copyright.

## Release guard / 发布检查

Preserve legacy and third-party notices in `public/legal/` so Vite copies them into the published site. The unit tests check that the public APW license matches the root license, that the MIT baseline notice is unchanged, that npm metadata is consistent, and that shipped dependency notices still match the installed versions. Recheck notices whenever dependencies change.

Have qualified counsel review this custom permission notice before using it as the basis for paid customer contracts, enforcement, warranties, jurisdiction clauses or service-level commitments. A contract for hosting/support/payment is separate from this repository license. This transition does not certify ownership or legal enforceability.

## Primary references checked on 2026-09-06

- GitHub licensing: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- MIT grant and preservation conditions: https://choosealicense.com/licenses/mit/
- GitHub public-repository rights (D.5): https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- npm custom license metadata and private flag: https://docs.npmjs.com/files/package.json/
- GitHub Pages usage restrictions: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
