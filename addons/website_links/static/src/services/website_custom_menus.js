/** @odoo-module  */

import { registry } from '@web/core/registry';

registry.category('website_custom_menus').add('website_links.menu_link_tracker', {
    openWidget: (services) => services.website.goToWebsite({ path: `/r?u=${encodeURIComponent(services.website.contentWindow.location.href)}` }),
    isDisplayed: (env) => env.services.website.currentWebsite && env.services.website.contentWindow && !(env.services.website.currentWebsite?.metadata.viewXmlid === 'website_links.page_shorten_url'),
});
registry.category('website.should_display_seo').add('website_links.seo_test_fn', (env) => !(env.services.website.currentWebsite?.metadata.viewXmlid === 'website_links.page_shorten_url'));
registry.category('website.should_display_page_properties').add('website_links.page_properties_test_fn', (env) => !(env.services.website.currentWebsite?.metadata.viewXmlid === 'website_links.page_shorten_url'));
