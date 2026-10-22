/** Builds the serializable label objects passed from Astro pages to the auth form islands. */
import { getDictionary } from '@/i18n';
import type { Locale } from '@/i18n/config';
import { routes } from '@/lib/routes';
import type { AuthCommonLabels } from '@/components/islands/AuthForms';

export const authCommonLabels = (lang: Locale): AuthCommonLabels => {
  const d = getDictionary(lang);
  return {
    showPassword: d.auth.showPassword,
    hidePassword: d.auth.hidePassword,
    unavailableTitle: d.auth.unavailableTitle,
    unavailableBody: d.auth.unavailableBody,
    contactUs: d.common.contactUs,
    contactHref: routes.contact(lang),
    loading: d.common.loading,
    formErrors: d.validation.formErrors,
    errorGeneric: d.contactPage.form.errorGeneric,
  };
};
