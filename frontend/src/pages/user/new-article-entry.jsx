import { isWizardEnabled } from "@/lib/featureFlags";
import LegacyNewArticle from "@/pages/user/new-article";
import WizardLayout from "@/pages/user/wizard/WizardLayout";

/**
 * Feature-flag gate for the article creation page.
 *
 *  - VITE_ENABLE_WIZARD === "true" → multi-step wizard
 *  - otherwise                       → legacy one-shot form
 *
 *  Routes:
 *    /dashboard/new-article            → start fresh
 *    /dashboard/new-article/:articleId → resume (wizard mode only;
 *                                        the legacy page ignores the param)
 */
export default function NewArticleEntry() {
  if (isWizardEnabled()) {
    return <WizardLayout />;
  }
  return <LegacyNewArticle />;
}
