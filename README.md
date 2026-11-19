# Life Grid

**Your whole life on one page: one cell per month, one headline per cell.**

**[Open Life Grid →](https://lifegrid-zeta.vercel.app/)** · runs in your browser, no account, no server

Each row is a year (labelled with your age) and each column a month. A cell holds the single most
memorable thing from that month in a few words. Cells are tinted by where you lived, and the colours
follow the seasons of a life: spring at birth, through summer and autumn, to winter.

## See it with real lives

Read-only grids built from public sources. Each one is just a link:

- [Arthur C. Clarke][clarke] · [Neil Armstrong][armstrong] · [Steve Jobs][jobs]
- [Tim Berners-Lee][timbl] · [David Attenborough][attenborough]

Months that a source only gives as a year are marked "to confirm". The source files are in [`data/`](data/).

## Why

- **Short questions fill a long life.** One answer fills many cells; a yearly tradition fills that month in every year.
- **Nine views of the same data:** grid, three timelines (one with world events), tree, voyager, spiral, a tech timeline beside a century of inventions, and the car of your birth year.
- **Private by design.** No backend. Your grid lives in your browser and in the link, and goes nowhere else.
- **Shareable.** The whole grid is in the URL. Share a read-only link, or open your own on another device.
- **Yours to keep.** Export JSON or CSV, import a sheet, undo any change.
- **Works on a phone** as well as a large screen.

## The data: a whole life in a link

A life is five things: `name`, `birth` (month and place), `homes` (where you lived, in order), `stays`
(temporary moves) and `cells` (one headline per month). It has two interchangeable forms.

**1. The link** is the compact form, and the one the app shares and saves.

```
https://lifegrid-zeta.vercel.app/#s.<payload>    read-only
https://lifegrid-zeta.vercel.app/#<payload>      the owner's, opens for editing
```

The payload is plain text, compressed and made URL-safe:

```
2                       format version
Sam                     name
1984  3  Madison, WI    birth year, month, place (tab-separated)
                        (interview state; ignore)
0     Madison, WI       homes: months since birth, place
111   Portland, OR
                        blank line ends homes; stays follow, then another blank line
Born Madison            month 0: one line per month from the birth month
                        an empty line is an empty month
?First steps            a leading ? marks an entry not yet confirmed
```

text → UTF-8 → raw DEFLATE → Base64url. No dates are written: a month is its line number, counted from birth.

**2. JSON** (`life-grid/1`) is the readable form, for people and other tools. Export it from the menu.

```json
{ "schema": "life-grid/1", "name": "Sam",
  "birth": { "month": "1984-03", "place": "Madison, WI" },
  "homes": [{ "from": "1984-03", "place": "Madison, WI" }],
  "stays": [],
  "cells": [{ "month": "1984-03", "text": "Born Madison" },
            { "month": "1985-02", "text": "First steps", "confirmed": false }] }
```

**Why a link and not just JSON**

| | Link | JSON |
|---|---|---|
| Size, a life with 165 entries | 1,743 characters | 7,494 (2,623 if compressed the same way) |
| Storage | None: the address is the data | A file to host or send |
| Sharing | Paste it anywhere a URL fits | Attach or upload |
| Privacy | After the `#`, so never sent to a server | Depends where the file goes |
| Readable by eye | No | Yes |

Use the link to pass a life around; use JSON to inspect, edit by hand or archive. Either converts to the other without loss.

### Use it in your project

One file, no dependencies, served with open CORS. `read` takes a link, a bare payload or a JSON export:

```html
<script type="module">
  import { read, pickEvents, fmt } from 'https://lifegrid-zeta.vercel.app/lifegrid.js';

  const life = await read(location.hash || prompt('Paste a Life Grid link'));  // null if not a Life Grid
  for (const ev of life ? pickEvents(life, 10) : []) {
    const li = document.createElement('li');
    li.textContent = `${fmt(ev.month)}, age ${ev.age}: ${ev.text}`;   // textContent, never innerHTML
    document.body.append(li);
  }
</script>
```

`life` is plain data (`name`, `birth`, `homes`, `stays`, `cells`). Helpers include `events`, `pickEvents`,
`homeAt` and `ageColor`. To bundle the reader, copy [`src/lifegrid.ts`](src/lifegrid.ts). Without it, the
decoding steps above are about ten lines in any language.

Full format: [docs/data-format.md](docs/data-format.md). Reader API and rules for views: [docs/making-a-view.md](docs/making-a-view.md).

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks, then builds to dist/
```

A static single-page app (React, TypeScript, Vite). It deploys to any static host.

## Add a view or a theme

Both are drop-in files: add one file, rebuild, and it appears in the app. Nothing else needs registering.

- **A new view** is one `.tsx` file in `src/views/`. It exports a small description (id, name, icon, the
  percent filled at which it unlocks) and a component that receives the life to draw. It shows up in the
  header's view switcher and under Views in the menu. Guide, written so a person or an LLM can follow it
  without reading the rest of the code: [docs/making-a-view.md](docs/making-a-view.md).
- **A new theme** is one `.json` file in `themes/`. It sets colours, fonts, corner sizes and, optionally,
  the season-of-life colour ramp, for light and dark. It shows up under Appearance in the menu. Themes are
  data only and are validated on load. Format: [docs/themes.md](docs/themes.md).

Sample lives to test against are in `data/samples/`, and `/examples/` on the development server opens each
one in the app.

## Contributing

The code is at [github.com/inthaiguy/LifeGrid](https://github.com/inthaiguy/LifeGrid). Fork it, or open an issue or pull request there.
See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md). Plans and
open questions are in [docs/roadmap.md](docs/roadmap.md).

## Privacy

The app sends your grid nowhere. Grids you make are kept in your browser, as separate sheets you can switch between. Anyone with a link can read everything in it, so share links with care.

[clarke]: https://lifegrid-zeta.vercel.app/#s.1VjNciI5Ej6bp8i97Ua4N4x7uns8e6gA_DPuNjYBTDvmmJQSSmGVkpBU0DUn3mFOG9H9cjzJRqoAUwV4NmJPyxGlUp_y58tPddnquJAVrtW-an86a1-e9bWljFCdw42dGbTqrP3xrH3x8_uz9lWrdXG43rq8vDx7YKvYvv7304dPZz02nE_4HEZOwwPaF2y1Wl12FrSFrZvW__sv-czaeggZQdfpoH0G9zaQmxu0FNCVMOJUUyjf9NLnBXkIDFUg_3csQy7RQEc7uGWX0lu7epzn2nvNlhTMteEAPJ3qlFy1PnCccyAFU1NqO6sv7n4PFAI5YAuODJbgMZAxOpDfWqxX32--BYfvxuQc-eA0GhiKsV-vfsC8mBjtM1I76wfmecaG6qvr1fch-bQgGKAL5Xr14xym2vkAHs3RiybPTnDAevV9nBGMyAZtyYjbKTtA6HZ7kLIN5ENtX8d77QPaAKR0YHcOo1STTQk6Ex8cpsHX7BuJvzV6loXmxbbGXUo5Jw8I08KYd0HnBEsB6lqJwLz5NjfsMGi2wFMYzTGlfV_JwJEpFEnVHCxWLkZolZfNfXT-EEeF18Yj0MAt2oC-hM4SnYqROQUj7vUmetc21tvopTw4IOll2qiMWa1X__ZwY9WeSdJH5zR5waZNaaGP5VSTUTH1n4u5RAJu9SKmn6tTUl5IjU3hftpKOjPU1oe4cIvGyP-PMeJ_t7wg8496QG6-zSWLco_AcIMuZIeIj9xY3PeZ7WF4f-fCzmDscEHGkJNQHCYiHi2HvVEMu-7vUWmk-6P7HqOXVoQeOzT7oYurOpSAVlXRD40EJ0PCNKuSyDk7x8va8leyoXCxdo7c79dixnHvtmMCuvXqx2uIronmMEQ7oxosNORh6jiPTp8zHQh-RRea2IdE01iXY5w7nqCtF7aY9PGl4hrAE9F_Chk5GGlF2ywdqcGkyyV0yRKGrLIhrNlsb8h2FhFdbxo-puxE5bWSr6yFBFLH3h91u01hhsaQhGkLUerDZ3p-ghVO7mv4j1a3kfWkReAWQ8b5sR7v7HpDwqgKX8vGvVUaLTylhBY6arEpi5qb5LfHm1Hvab368wsabWcIA6f_2DJtMnA81ZL4DdTbouFiUxeSbrLwzM6oBtBkgA5N6Un9CwxK3yuNM8ueFKCHORvN2-Ou2cwzbaHin_1j7ozUwgCbfZ2MQiFF2EVjMFI_9Emh2TjsEwUvJW4NlfClmDidvkgvP9ISfmf30kqu9UKGaFXaW76aaotG-4rKbGzFQ46uxXfsCH0zvDGTu5VNDO8cYYht0rhKLLy9HjtGu4fzT454lHt3tTFCa4-YVxm5Y3Vqf3J5cdH-BTqbWz2p0nsqj3Cr2MFUm1wmP6HfQJVDRTpoT0fnl9g8-RQdWM51NYVgqUO2y4EwkDiv8DyicyhjvDNnYxja7WjQ646O3PjeHp2KexZPUxjLyI15a9BnxP6srdoLdLFPQUmXSrYKtmOqzrxzdkF4YxCVAIwzR0dy_sA-bLuBp_GiB-w1JKvojwUXvorMEPN9HkgeaVIY9DEQcU1us15974BUtRBo3NYnVXjcMHg8vEvVaKnEP_T-CT2D7oWgffX-03r1Z_vqUxNNspsKx1AdJCCfUxR4h4M22b0HYObQBg-OvFZkA8wKweUDhsLv1e5fo_3w4WQZi4OvmpZVLkfkyKom_z6QN5rg5gUtlvhCoDT5vzz7w8cqUpdvt2DF1VzYIHpFfAndKemLWliqZO6E19Edr0532XjLNumXPpDTkqpYajBxjCrFutDd7_n2xS-7Xh8vuQ6xjy5lq_cHQLIvqU81m7htUEQ1wzcH3WpTmxgdn0o5BIYnN9E11ZSMyQc91RvBxHbmyHvAjRgcXd_Lge2rn386h9HcSQ8cqDyhPwVoYXT73IE7J13TR4lUfC3EQAllBRclzoCX5PxB6JLTwqEG-PICPhemhMuL9lUNy8BgOeEStMjwhaZlK7nGnC18sVEr9inn2EP7CCt5vg3rx_Zetg54ppaDnkNlGiU3YB_exfEKvrTKcU6vo3e7MRLL_X09P4ELqyS411jWlWcfFQFCr3tTPQHQpmQMu-1sqz86Ko7-zeoFOa93r-QtwR5q-wZL32VCozuariLVRfvSlBh74nTDy288Ae7QKYrqv8m4fXYE40xmut3hbgqm5pOmopNd5_Ky0sexzp7RR1e1vHSKkLETcQETzTOH86yESQmPpA30046h1_d3BPwr5nmlT-sTvUrekBaEhhqjPumWm_AP2HvyvmmwqXDLy1jhT6bM58URjXmMSIY6zaRa2xf1m-2ehPIcPPCVvI-aoxK3Uh7b2j56ZlL1SfSG1nJh0-Nyeuz0bFYf063kzlUj0p9DD92E7buuEBN09ZyU_9sBtDizYwlKLOLjo1n7rVaFiJTox833rxqSHhtDqRiMAsfn73-h3nRO1QO6PN3e29_YFxZzDUo-sHDpIdMelF5Iq_o0Y46yNxkV1gd2eaPshFoE23ZATzKdoy2b011s4-NjIl_zjkG6uggZTLQLmcISsFCaISfvcSZj41ou_hqh_wA
[armstrong]: https://lifegrid-zeta.vercel.app/#s.3VbBbuNGDD1LX8FjC8iA7cRt0j0EjrPebHeTTaPdJldGoiQmY9KYoezNrb_R3-uXFCPZXmebtCiKAkV5EkacR_LxkdI4vSR26ej4YJgcJTcYGpbaVOCjriU0vMzgQ8OaTJLjo8NkPEnT4cte6ei7UXKDS3xQIcPN4Xg4SW4oGLzHCh_JjDJ4KyWjYDoej5IrkoCFOsxg7tRzien48CDJUeCMqdYMZui4Ui-M6fj4OHldrtGX4cn5wdEkOdc2mEoGH-kzhvTweJzMWAoWQeNNMml6ql6ABZ6pIv2v28kcF-weIZCZo9CXsaX7L-7m1pYkBkt2alCQN664QCNAKaFiHwyCOu0D5YbeAiB5FWyNC3RAUrMQeZYa0OCq9WVLL4W7xNUjFOjcoF2CKey6vHWY7yLGMhC6C-aRhfy-R4HeM3lwKCVLncGnPIcZ3ql1Tj-1UQRMJQiu0AGuGE0jwjQEroXKGP3n-WAy2iLek0HluG56hCuvC7XejyTe2YXWxR1aTO-desL09T0VkZTKyEPDAdaRiobjGRR45_bZuCZHGKiEyusCsDBeEZStPe489gM7ptZIUAy-ua-_fY7RNx7LFo1Cj7ilv0_1cjqbgsUp-1LZNS01NtEUNiPTA110jAb4EYUM8obQqzwTsEf2WjyQDZa6Jh-r6eAzuB2MTr_q-DSfAgeotJWSylfQENwrS3hJItcUyQ59568pkF9R5HzBIbDKJv7tYDTZb1eanmFbN7EF79CTQMlYi0am12wNIFi70I2E0q0LhQywjlyvNU1njQYSqNSDNQS3g_EQzh4FB7miT3P-bM1-3Ax0RR7Gw--z4XAIVZ9ITo6K2D4MgAIYrJ-Vl8rt7BSLh3bZVYlSks_gDS1YGCZPe90fHv2wGcxSi4eoNRYISyz2dPb2ySZT6Qoq8RG06h6nS3VOYRSB_jCsG0F3eorOrhXcTdrTYUw_VFUngE3qEX-LPUp3T1B4WoPggsr-2g26h7DN60K3Qju5wGDkf_vl1wAl1Z4orpRP-Sy-Oye3jMttRcG4jitqv5IDwKLguMu-Luc94YoCRCFmYIRFQyHCfvkK_Glv_q6dzFRqT51Y0UEeGwMXVKKL5Jyr7FTYu1-i9Z7TuKNYBc7Rdb5zXLy4SP9RhnmcqR39swadI6nJ74_Zv2wnZ7xSX2z3zStYbNbPDL06eCd7k_1_tTPuP9ZzZF8xubL_G_kd
[jobs]: https://lifegrid-zeta.vercel.app/#s.zVTNctNADD7bT6EH6KFJ0x9OnialQ5gEPE0HuCprJRasJaPdbciN1-D1eBLGLW1xSdoZTui4kr79ftYe5otIN5QPXh0fZ8NsgQKXhuI4OD2ACXpeqQljNhxlJ2eH2XGeH-6fyken2VyTRGSBD0ybXnMwOspmGuDcRw29znAwyEq16FGqA3hvtFbJh8OzfeMnR9kktWSRpX__0eg0-6haBa6oT-zkNCvR6y1ar5PnYzUBFujJyv-vKi6xYb-FZdoGiDXBgzNQawrUm12kpiGDz7qEDccaxuw9vKGNpxj_lcAiosUAGOGKqIKJek9rejpVvFWWAOcRjfMxui-drzUHaNFIYvj5_ccj3-LauIWoMJXqNogddd62noADrDRJRdXfvekUQq0b6a1dYFrXkQxmHLBbX6rJU-yn3O_w1koB2rT07Prt8b313Tu5okYBW7TYkOw1dSrRtEqO7hbn6FiihrqHe9kpC_COPl3fn11R4LUEWJk2cEvrkUHJ39BekJLnHRo4bdrUueAxiaufGS_maMYUYIbJSAhK3ZD3L16zH_Bat7CIalsw8oShH91Deui-JjbqyZ9KJOMGJq_fg64e9d9D8xzdPtTOJXLadBmSNSgksQPaTZJLrfYhFRMURwYV41p010076oKD0O-vdHdQXNYq9GwixYxvyCAaSmg9_vG8Ci6xAhTRJG4no2IRqQ1Q6UYAw53yiy5YFnj4__0C
[timbl]: https://lifegrid-zeta.vercel.app/#s.zVXbbttIDH2WvoLoczdImya7fQoSO-m6G19qGcgzPaKtQUakQI7sVZ76G_t7-yULSXaublF0scDOkzAgec6cQ1Lv04Uv03cfT0-Ts-RGOBd-C1e8Dsh58luSpOnxy-v0_elpMhMJ9OTq13fJNSnnsn0SeHJ8nHwipg2-hWzr4z3p7v4suZRamUqpY_Ek4cPJwYQPZyfJpVhsWYzRDF1RG8VoaZpeijJ4hp5l-v8_51lEjQYY4apErilA5gqR8B_BXXu12CpUFY151wFP_1yJ5un5GFU9GXxGJpiIxsJJpC5tLBsyiAKd1e3HVvSuTZ4FMqPmNdJn8WwwPIJPRzBBK77LayAcFV0UbWsOruaTZ1VGJa4JBlJWdSSFrLFIpf3Yi-cUa-WOfFsX0ABhRSHI9qckfDgzlUqslaUguBUNOdz6nOCWlvuQXu0tLcEFTxwBOQcj3ZBCxHDXEezrYAB0jqpI-VMJHkyZILsGBqjBdo09q5fBW7EjsNpDme89a8-INz7uArYdwyhQG_WUH3keVu5aas53zzsZtKzGo8W_0-xbSJ0dIKsObC4NBsjEeYqvG-tQ_gLvqLXVFei7DsraVYJlFfdL4A_26yJS_gPVppqTtlzGpD4egptg9MIY4MJhTmXTBmfOE7uWhZk4j48mpOkN1uz2Rt3SEjpluyJpev47hcrAKWEkyDHi0Vo2R_XdM8ih34i6g32wDxnIL6tHx6YVMQwxIozYoo_1ntA0NGXVTr5UxJ7X4EipFG5e7s3zLzURw1Xw97ikWMBM_T3BSrRd0Z6J1PP6lTr7hp2LUYnawA35-N3p72e830LdhAwK9RZhUNTqdplzcuQ3OwkXdYsMF1vU14ZeMEvdOTFirat-5jIJ_kXoM1P2-6d73beHI6MQHlz8--tfBia1OgInOXWbhWFy_TMzMqZSvMKbReENRtarvCFthOkNVLtRz9N0yjAkI40wsvZ3CENvzv4B
[attenborough]: https://lifegrid-zeta.vercel.app/#s.3VRNT9xADD0nv8I_gEoLqIieIjbQ8rFQKuilN5PxJhYTe-VxiLa_vspS2MKyaBE9VPXRYz8_P9uzkx_iHYd8-9POXvYxO0mRejVvtuBI6ogSsv0sy_PRCy_53n42Ia4oOdnSu7O7m5XY3hiHmpbu3dF-NlEJKktfno_VBFjgET3_D634Qhq1nkOlnSUCdLhQd5a6wfZJ4FXVaERLDc_AFcqIRlBqjDRI-ajq2kIlxkgBuhlM1eACnVUwwhXZHVdr056jnKMZU4JTFIKvxhQH73hcgncmCRpuIWgvgAkQDAMrzExDV5G9AHeqLAm8IRggpl2MH5zb9U38UIVvHSUHTjBlSw43phgqTL4R_6HMBXpnGOGYk6vN4buww1Q7CRSGhRvb8BA3lOQdVqq4DRM00OlCgete3wZRHLJR5bpAmJnWhm1LaWtA2yi_bMhsDmeE5ipwTgGfdF5MCO8oLdi1KFhTS-LDBrZ4Sw8l09tYv8JnwlMCFThC8wZuqGZZC16cYWSpES6Nf266wn9kC9eNU3g36b9gxRn1cCJOJg-XuTqKY07QD_osri8wbSR78RS21NRqWi9ZcT1cY-wILiMKrZxVcc5VgxThMxoGnK8iFYeUKjSnV6r8jrwvcT_sDTq5NJaKhlU_SN4ZY4KDHu2fmOBbrbhymjUkcIz9LUu9Ou_ndr34YbdHo18

## License

[MIT](LICENSE)
