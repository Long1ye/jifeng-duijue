import nexusUrl from '../../assets/map-modules/howling-sites-v3/nexus.png?url';
import redNexusUrl from '../../assets/map-modules/howling-red-team-v1/nexus.png?url';
import {BRIDGE_SLOTS,bridgePoint} from '../game/Bridge';

export const SITE_ART_URLS={nexus:nexusUrl,nexusRed:redNexusUrl} as const;
export type SiteArtKind=keyof typeof SITE_ART_URLS;
export const siteArtKey=(kind:SiteArtKind)=>`bridge-site-${kind}`;
/** Alpha-tested masonry bottom in both 1024px Nexus variants. */
export const NEXUS_FOOT_ORIGIN_Y=920/1024;
export interface SiteArtPlacement {kind:SiteArtKind;u:number;v:number;size:number;flipX:boolean}

/** Both round cores sit on the bridge centerline; their lane-facing edges feed minion waves. */
export const BRIDGE_SITE_ART:SiteArtPlacement[]=[
 ...BRIDGE_SLOTS.filter(s=>s.id.endsWith('nexus')).map(s=>({kind:s.team==='blue'?'nexus' as const:'nexusRed' as const,u:s.u,v:0,size:230,flipX:false})),
];

export const siteArtPoint=(site:SiteArtPlacement)=>bridgePoint(site.u,site.v);
