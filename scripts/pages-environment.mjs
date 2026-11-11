/** @param {Record<string, string | undefined>} env */
export function pagesEnvironment(env) {
 const production=env.DEPLOYMENT_ENV==='production' && !!env.PRODUCTION_BRANCH && env.CF_PAGES_BRANCH===env.PRODUCTION_BRANCH;
 return {...env,DEPLOYMENT_ENV:production?'production':'preview',SITE_URL:production?env.SITE_URL:''};
}
