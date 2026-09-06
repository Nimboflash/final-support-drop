/**
 * The V2 seed, committed as a fixture module (ticket P3).
 *
 * Copied verbatim from `docs/frontend-v2/mock/seed.json` at import time and
 * NEVER read from `docs/` at runtime: the panel must not depend on the
 * specification pack being present, and a fixture that can drift from what the
 * tests validated is not a fixture.
 *
 * This is the WIRE form — V2's lowercase snake_case. Nothing here is usable
 * until it passes through `normalizeSeed`, which runs every value through P2's
 * wire codec and parses the result with the panel-domain schemas
 * (ADR-0019 D6).
 *
 * Generated from the pack; edit the pack and regenerate rather than editing here.
 */

export const WIRE_SEED = {
  "schemaVersion": "drop.panel.mock.v2",
  "revision": 1,
  "clock": "2026-09-06T09:00:00Z",
  "projects": [
    {
      "id": "p1",
      "revision": 1,
      "workspaceId": "drop-demo",
      "titleFa": "زیبایی ناتمام",
      "type": "program",
      "parentProgramId": null,
      "parentBibleVersionId": null,
      "input": null,
      "stage": "research_content",
      "targetDate": null,
      "ownerId": "actor-editor",
      "selectedConceptVersionIds": [
        "c1-v1"
      ],
      "outputPlan": {
        "revision": 1,
        "includedConceptIds": [
          "c1"
        ],
        "requiredContentIds": [
          "o1",
          "o2",
          "o3",
          "o4"
        ],
        "optionalContentIds": []
      }
    },
    {
      "id": "p2",
      "revision": 1,
      "workspaceId": "drop-demo",
      "titleFa": "آیین مکث",
      "type": "program",
      "parentProgramId": null,
      "parentBibleVersionId": null,
      "input": {
        "references": [
          {
            "kind": "text",
            "text": "نمونه رفرنس نمایشی: مکث در میان ریتم روزمره و توجه به تجربه مشترک."
          }
        ]
      },
      "stage": "calendar",
      "targetDate": "2026-09-12",
      "ownerId": "actor-editor",
      "selectedConceptVersionIds": [
        "c4-v1"
      ],
      "outputPlan": {
        "revision": 1,
        "includedConceptIds": [
          "c4"
        ],
        "requiredContentIds": [
          "o5",
          "o6"
        ],
        "optionalContentIds": []
      }
    },
    {
      "id": "p3",
      "revision": 1,
      "workspaceId": "drop-demo",
      "titleFa": "رد دست در اشیا",
      "type": "weekly_lens",
      "parentProgramId": "p2",
      "parentBibleVersionId": "bible-p2-v1",
      "input": null,
      "stage": "draft",
      "targetDate": null,
      "ownerId": "actor-editor",
      "selectedConceptVersionIds": [],
      "outputPlan": {
        "revision": 1,
        "includedConceptIds": [],
        "requiredContentIds": [],
        "optionalContentIds": []
      }
    }
  ],
  "concepts": [
    {
      "id": "c1",
      "projectId": "p1",
      "activeVersionId": "c1-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "pendingRevisionId": null,
      "replacesConceptId": null
    },
    {
      "id": "c2",
      "projectId": "p1",
      "activeVersionId": "c2-v2",
      "reviewStatus": "in_review",
      "freshness": "current",
      "pendingRevisionId": null,
      "replacesConceptId": null
    },
    {
      "id": "c3",
      "projectId": "p1",
      "activeVersionId": "c3-v1",
      "reviewStatus": "rejected",
      "freshness": "current",
      "pendingRevisionId": null,
      "replacesConceptId": null
    },
    {
      "id": "c4",
      "projectId": "p2",
      "activeVersionId": "c4-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "pendingRevisionId": null,
      "replacesConceptId": null
    }
  ],
  "conceptVersions": [
    {
      "id": "c1-v1",
      "conceptId": "c1",
      "number": 1,
      "titleFa": "زیبایی ناتمام",
      "titleEn": "Beautiful Imperfection",
      "thesisFa": "نقص کوچک می‌تواند رد حضور انسان باشد؛ چیزی که تجربه را از یک محصول بی‌نام جدا می‌کند.",
      "dropRationaleFa": "توجه به شخصیت ماده و انتخاب آگاهانه، پیوند این ایده با Taste است.",
      "directions": [
        "editorial",
        "film",
        "music",
        "landing"
      ],
      "feedbackAppliedFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "c2-v1",
      "conceptId": "c2",
      "number": 1,
      "titleFa": "رد دست",
      "titleEn": "Traces of the Hand",
      "thesisFa": "روایت اشیایی که اثر سازنده را پنهان نمی‌کنند؛ از سطح یک فنجان تا بافت کاغذ.",
      "dropRationaleFa": "انتخاب کم‌تعداد با توضیح روشن درباره چرایی حضور هر اثر.",
      "directions": [
        "editorial",
        "film",
        "music",
        "landing"
      ],
      "feedbackAppliedFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "c3-v1",
      "conceptId": "c3",
      "number": 1,
      "titleFa": "شکستن برای دیده شدن",
      "titleEn": "Breaking for Attention",
      "thesisFa": "نمایشی پرسر‌وصدا از شکستگی برای جلب توجه.",
      "dropRationaleFa": "این نسخه بیش از تجربه، بر نمایش تکیه دارد و برای DROP مناسب نیست.",
      "directions": [
        "editorial",
        "film",
        "music",
        "landing"
      ],
      "feedbackAppliedFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "c4-v1",
      "conceptId": "c4",
      "number": 1,
      "titleFa": "آیین مکث",
      "titleEn": "Rituals of Pause",
      "thesisFa": "لحظه‌های کوتاه توجه در زندگی شهری: گوش‌دادن، نگاه‌کردن و کنار هم نشستن.",
      "dropRationaleFa": "کیفیت حضور، مهمان‌نوازی و پیوند صدا و فضا.",
      "directions": [
        "editorial",
        "film",
        "music",
        "landing"
      ],
      "feedbackAppliedFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "c2-v2",
      "conceptId": "c2",
      "number": 2,
      "titleFa": "رد دست",
      "titleEn": "Traces of the Hand",
      "thesisFa": "سه شیء روزمره با رد دست سازنده، کنار یک متن کوتاه درباره انتخاب ماده و حفظ تفاوت‌ها قرار می‌گیرند.",
      "dropRationaleFa": "انتخاب کم‌تعداد با توضیح روشن درباره چرایی حضور هر اثر.",
      "directions": [
        "editorial",
        "film",
        "music",
        "landing"
      ],
      "feedbackAppliedFa": "نسخه جدید به یک چیدمان کوچک و قابل توضیح در فضای DROP محدود شده است.",
      "createdAt": "2026-09-06T09:00:00Z"
    }
  ],
  "content": [
    {
      "id": "o1",
      "projectId": "p1",
      "conceptId": "c1",
      "type": "editorial",
      "activeVersionId": "o1-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "editorialStatus": "passed",
      "blockedReasonFa": null,
      "pendingRevisionId": null
    },
    {
      "id": "o2",
      "projectId": "p1",
      "conceptId": "c1",
      "type": "film",
      "activeVersionId": "o2-v1",
      "reviewStatus": "in_review",
      "freshness": "current",
      "editorialStatus": "pending",
      "blockedReasonFa": "مرجع لازم در دسترس نیست؛ بازیابی انسانی لازم است.",
      "pendingRevisionId": null
    },
    {
      "id": "o3",
      "projectId": "p1",
      "conceptId": "c1",
      "type": "music",
      "activeVersionId": "o3-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "editorialStatus": "passed",
      "blockedReasonFa": null,
      "pendingRevisionId": null
    },
    {
      "id": "o4",
      "projectId": "p1",
      "conceptId": "c1",
      "type": "landing",
      "activeVersionId": "o4-v1",
      "reviewStatus": "in_review",
      "freshness": "current",
      "editorialStatus": "pending",
      "blockedReasonFa": null,
      "pendingRevisionId": null
    },
    {
      "id": "o5",
      "projectId": "p2",
      "conceptId": "c4",
      "type": "editorial",
      "activeVersionId": "o5-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "editorialStatus": "passed",
      "blockedReasonFa": null,
      "pendingRevisionId": null
    },
    {
      "id": "o6",
      "projectId": "p2",
      "conceptId": "c4",
      "type": "social",
      "activeVersionId": "o6-v1",
      "reviewStatus": "approved",
      "freshness": "current",
      "editorialStatus": "passed",
      "blockedReasonFa": null,
      "pendingRevisionId": null
    }
  ],
  "contentVersions": [
    {
      "id": "o1-v1",
      "contentId": "o1",
      "conceptVersionId": "c1-v1",
      "number": 1,
      "titleFa": "چرا ناتمام را می‌بینیم؟",
      "bodyFa": "در این لنز به ردهای کوچک ساختن توجه می‌کنیم؛ ردهایی که معمولاً زیر سطح صیقلی پنهان می‌شوند. انتخاب‌ها قرار نیست نقص را تزئین کنند. هر انتخاب باید نشان دهد ماده، زمان و دست انسان چگونه به یک تجربه شخصیت می‌دهند.",
      "sourceIds": [
        "s1",
        "s2"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "o2-v1",
      "contentId": "o2",
      "conceptVersionId": "c1-v1",
      "number": 1,
      "titleFa": "دیدن زمان روی سطح اشیا",
      "bodyFa": "پیشنهاد نمایشی فیلم: یک مطالعه تصویری خیالی درباره تغییر سطح اشیا در گذر زمان. این عنوان نمونه است و به اثر واقعی ارجاع نمی‌دهد. برای نسخه نهایی، مرجع قابل دسترس و بررسی‌شده لازم است.",
      "sourceIds": [
        "s3"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "o3-v1",
      "contentId": "o3",
      "conceptVersionId": "c1-v1",
      "number": 1,
      "titleFa": "صدای فاصله‌های کوتاه",
      "bodyFa": "یک انتخاب موسیقی نمایشی با ریتم آرام و فضای کافی میان صداها؛ برای شنیدن جزئیات، نه پوشاندن گفت‌وگو. نام قطعات پس از تحقیق واقعی تعیین می‌شود.",
      "sourceIds": [
        "s2"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "o4-v1",
      "contentId": "o4",
      "conceptVersionId": "c1-v1",
      "number": 1,
      "titleFa": "ردی که باقی می‌ماند",
      "bodyFa": "زیبایی همیشه در کامل‌بودن نیست. گاهی در نشانه‌ای کوچک از ساختن، لمس‌کردن و گذشت زمان پیدا می‌شود. این هفته در DROP به همین نشانه‌ها نزدیک می‌شویم.",
      "sourceIds": [
        "s1"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "o5-v1",
      "contentId": "o5",
      "conceptVersionId": "c4-v1",
      "number": 1,
      "titleFa": "یک مکث کوتاه",
      "bodyFa": "مکث را به یک تمرین بزرگ تبدیل نمی‌کنیم. چند لحظه برای توجه به صدای محیط، جنس یک سطح و حضور آدم‌های دیگر کافی است. این متن نمونه تأییدشده برای نمایش پکیج است.",
      "sourceIds": [
        "s1",
        "s2"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "o6-v1",
      "contentId": "o6",
      "conceptVersionId": "c4-v1",
      "number": 1,
      "titleFa": "کمی آهسته‌تر",
      "bodyFa": "این هفته برای چند لحظه مکث می‌کنیم؛ کنار یک صدا، یک تصویر و یک گفت‌وگوی کوتاه. متن نمایشی DROP.",
      "sourceIds": [
        "s2"
      ],
      "createdAt": "2026-09-06T09:00:00Z"
    }
  ],
  "sources": [
    {
      "id": "s1",
      "titleFa": "یادداشت نمایشی درباره رد دست در ساخت اشیا",
      "url": "https://drop-demo.invalid/iran/handmade",
      "language": "fa",
      "region": "iran",
      "status": "available_demo",
      "isMock": true
    },
    {
      "id": "s2",
      "titleFa": "نمونه مرجع بین‌المللی درباره تجربه ماده",
      "url": "https://drop-demo.invalid/world/material",
      "language": "en",
      "region": "international",
      "status": "available_demo",
      "isMock": true
    },
    {
      "id": "s3",
      "titleFa": "آرشیو نمایشی فیلم؛ دسترسی مسدود",
      "url": "https://drop-demo.invalid/archive/film",
      "language": "fa",
      "region": "iran",
      "status": "blocked",
      "isMock": true
    }
  ],
  "comments": [
    {
      "id": "comment-c2",
      "target": {
        "kind": "concept",
        "id": "c2",
        "versionId": "c2-v1"
      },
      "actorId": "actor-editor",
      "bodyFa": "از توضیح کلی فاصله بگیر و یک موقعیت ملموس در فضای DROP پیشنهاد بده.",
      "createdAt": "2026-09-06T09:00:00Z"
    }
  ],
  "decisions": [
    {
      "id": "d-c1",
      "target": {
        "kind": "concept",
        "id": "c1",
        "versionId": "c1-v1"
      },
      "actorId": "actor-guardian",
      "activeRole": "demo_concept_reviewer",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-c3",
      "target": {
        "kind": "concept",
        "id": "c3",
        "versionId": "c3-v1"
      },
      "actorId": "actor-guardian",
      "activeRole": "demo_concept_reviewer",
      "outcome": "rejected",
      "reasonFa": "بیش از حد نمایشی است؛ ارتباط روشن‌تری با تجربه روزمره لازم دارد.",
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-c4",
      "target": {
        "kind": "concept",
        "id": "c4",
        "versionId": "c4-v1"
      },
      "actorId": "actor-guardian",
      "activeRole": "demo_concept_reviewer",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-c2-v1",
      "target": {
        "kind": "concept",
        "id": "c2",
        "versionId": "c2-v1"
      },
      "actorId": "actor-guardian",
      "activeRole": "demo_concept_reviewer",
      "outcome": "revision_requested",
      "reasonFa": "ایده باید به تجربه مشخص‌تری در فضا متصل شود.",
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-o1",
      "target": {
        "kind": "content",
        "id": "o1",
        "versionId": "o1-v1"
      },
      "actorId": "actor-editor",
      "activeRole": "demo_fa_editorial",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-o3",
      "target": {
        "kind": "content",
        "id": "o3",
        "versionId": "o3-v1"
      },
      "actorId": "actor-editor",
      "activeRole": "demo_fa_editorial",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-o5",
      "target": {
        "kind": "content",
        "id": "o5",
        "versionId": "o5-v1"
      },
      "actorId": "actor-editor",
      "activeRole": "demo_fa_editorial",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    },
    {
      "id": "d-o6",
      "target": {
        "kind": "content",
        "id": "o6",
        "versionId": "o6-v1"
      },
      "actorId": "actor-editor",
      "activeRole": "demo_fa_editorial",
      "outcome": "approved",
      "reasonFa": null,
      "createdAt": "2026-09-06T09:00:00Z"
    }
  ],
  "packages": [
    {
      "id": "pkg-p2-v1",
      "familyId": "pkg-p2",
      "projectId": "p2",
      "version": 1,
      "status": "current",
      "conceptVersionIds": [
        "c4-v1"
      ],
      "contentVersionIds": [
        "o5-v1",
        "o6-v1"
      ],
      "files": [
        {
          "path": "README.md",
          "contentVersionId": null,
          "body": "# DROP — Demo package\n\nFictional approved sample content. No real research or publication has occurred.\n"
        },
        {
          "path": "content/o5-v1.md",
          "contentVersionId": "o5-v1",
          "body": "# یک مکث کوتاه\n\nمکث را به یک تمرین بزرگ تبدیل نمی‌کنیم. چند لحظه برای توجه به صدای محیط، جنس یک سطح و حضور آدم‌های دیگر کافی است. این متن نمونه تأییدشده برای نمایش پکیج است.\n"
        },
        {
          "path": "content/o6-v1.md",
          "contentVersionId": "o6-v1",
          "body": "# کمی آهسته‌تر\n\nاین هفته برای چند لحظه مکث می‌کنیم؛ کنار یک صدا، یک تصویر و یک گفت‌وگوی کوتاه. متن نمایشی DROP.\n"
        }
      ],
      "createdAt": "2026-09-06T09:00:00Z",
      "isMock": true
    }
  ],
  "calendar": [
    {
      "id": "cal-p2",
      "projectId": "p2",
      "packageFamilyId": "pkg-p2",
      "packageVersionId": "pkg-p2-v1",
      "titleFa": "آیین مکث — پکیج هفتگی",
      "date": "2026-09-12",
      "endDate": null,
      "timezone": "Asia/Tehran",
      "status": "planned",
      "ownerId": "actor-planner",
      "noteFa": "این رویداد فقط برنامه نمایشی است؛ انتشار انجام نشده است."
    }
  ]
} as const;

export const WIRE_SUPPORTING = {
  "isMock": true,
  "actors": [
    {
      "id": "actor-guardian",
      "nameFa": "نگار — نمونه",
      "capabilities": [
        "concept.review"
      ]
    },
    {
      "id": "actor-editor",
      "nameFa": "آرمان — نمونه",
      "capabilities": [
        "content.review",
        "fa.editorial",
        "comment.create"
      ]
    },
    {
      "id": "actor-planner",
      "nameFa": "سارا — نمونه",
      "capabilities": [
        "calendar.edit"
      ]
    },
    {
      "id": "actor-viewer",
      "nameFa": "بازبین — نمونه",
      "capabilities": [
        "read"
      ]
    }
  ],
  "bibles": [
    {
      "id": "bible-p2-v1",
      "programId": "p2",
      "approved": true,
      "conceptVersionIds": [
        "c4-v1"
      ],
      "isMock": true
    }
  ],
  "coveragePlans": [
    {
      "id": "coverage-c1-v1",
      "conceptVersionId": "c1-v1",
      "frozenAt": "2026-09-06T09:00:00Z",
      "buckets": [
        {
          "region": "iran",
          "target": 2,
          "availableSourceIds": [
            "s1"
          ],
          "blockedSourceIds": [
            "s3"
          ]
        },
        {
          "region": "international",
          "target": 2,
          "availableSourceIds": [
            "s2"
          ],
          "blockedSourceIds": []
        }
      ]
    }
  ],
  "retrievalRequests": [
    {
      "id": "retrieval-s3",
      "sourceId": "s3",
      "affectedContentIds": [
        "o2"
      ],
      "status": "open",
      "reasonFa": "دسترسی به منبع نمونه مسدود است؛ دریافت قانونی توسط پژوهشگر لازم است."
    }
  ],
  "notifications": [
    {
      "id": "n1",
      "projectId": "p1",
      "messageFa": "نسخه دوم «رد دست» آماده بررسی است.",
      "href": "/studio/projects/p1/concepts?concept=c2&version=c2-v2"
    },
    {
      "id": "n2",
      "projectId": "p1",
      "messageFa": "مرجع پیشنهاد فیلم در دسترس نیست.",
      "href": "/studio/projects/p1/content?item=o2"
    }
  ]
} as const;
