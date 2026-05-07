import {
  Component, OnInit, OnDestroy, AfterViewInit,
  HostListener, ViewChild, ElementRef,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { UserRole } from '../../models/user.model';
import gsap from 'gsap';

interface TabDef {
  id: string;
  label: string;
  icon: string;
  iconActive: string;
  route: string;
}

const ALL_TABS: TabDef[] = [
  { id: 'tab1', label: 'Home',      icon: 'home-outline',      iconActive: 'home',      route: '/tabs/tab1' },
  { id: 'tab2', label: 'Analytics', icon: 'analytics-outline', iconActive: 'analytics', route: '/tabs/tab2' },
  { id: 'tab4', label: 'Records',   icon: 'wallet-outline',    iconActive: 'wallet',    route: '/tabs/tab4' },
  { id: 'tab3', label: 'Profile',   icon: 'person-outline',    iconActive: 'person',    route: '/tabs/tab3' },
];

// Pill dimensions — must match SCSS .floating-pill
const PILL_W  = 56;   // pill width/height px
const PILL_R  = PILL_W / 2;  // 28

// SVG bar height
const BAR_H = 70;

// Ear bump on right shoulder
const EAR_W = 22;
const EAR_H = 10;

@Component({
  selector: 'app-animated-tab-bar',
  templateUrl: './animated-tab-bar.component.html',
  styleUrls: ['./animated-tab-bar.component.scss'],
  standalone: false,
})
export class AnimatedTabBarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pill',     { static: false }) pillRef!:     ElementRef<HTMLElement>;
  @ViewChild('wavePath', { static: false }) wavePathRef!: ElementRef<SVGPathElement>;

  tabs: TabDef[] = [];
  activeId = 'tab1';
  barW = window.innerWidth;

  private waveObj  = { cx: 0 };
  private routerSub!: Subscription;
  private ready = false;

  constructor(
    public authSvc: FirebaseAuthService,
    private router: Router,
  ) {}

  get isSuperAdmin(): boolean {
    return this.authSvc.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get activeTab(): TabDef | undefined {
    return this.tabs.find(t => t.id === this.activeId);
  }

  ngOnInit() {
    this.barW = window.innerWidth || 390;
    this.tabs = this.isSuperAdmin
      ? ALL_TABS
      : ALL_TABS.filter(t => t.id !== 'tab4');

    this.activeId   = this.resolveId(this.router.url);
    this.waveObj.cx = this.calcCx(this.activeId);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.onNav(e.urlAfterRedirects));
  }

  ngAfterViewInit() {
    this.ready = true;
    this.applyInstant(this.waveObj.cx);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() {
    this.barW = window.innerWidth;
    const cx = this.calcCx(this.activeId);
    this.waveObj.cx = cx;
    if (this.ready) this.applyInstant(cx);
  }

  private onNav(url: string) {
    const id = this.resolveId(url);
    if (id === this.activeId) return;
    this.activeId = id;
    if (this.ready) this.animateTo(this.calcCx(id));
  }

  private resolveId(url: string): string {
    if (url.includes('/tab4')) return 'tab4';
    if (url.includes('/tab3')) return 'tab3';
    if (url.includes('/tab2')) return 'tab2';
    return 'tab1';
  }

  private calcCx(id: string): number {
    const idx = Math.max(0, this.tabs.findIndex(t => t.id === id));
    const tw  = this.barW / this.tabs.length;
    return tw * idx + tw / 2;
  }

  private applyInstant(cx: number) {
    gsap.set(this.pillRef.nativeElement, { x: cx - PILL_R, y: -20 });
    this.wavePathRef.nativeElement.setAttribute('d', this.buildPath(cx));
  }

  private animateTo(newCx: number) {
    gsap.killTweensOf(this.waveObj);
    const pill     = this.pillRef.nativeElement;
    const wavePath = this.wavePathRef.nativeElement;
    const self     = this;
    gsap.to(this.waveObj, {
      cx: newCx,
      duration: 0.38,
      ease: 'power2.inOut',
      onUpdate() {
        const cx = self.waveObj.cx;
        gsap.set(pill, { x: cx - PILL_R, y: -20 });
        wavePath.setAttribute('d', self.buildPath(cx));
      },
    });
  }

  private buildPath(cx: number): string {
    const W  = this.barW;
    const H  = BAR_H;

    // Pill sits 30px above bar top (y: -30). With pill radius 28px, the pill
    // bottom edge is 2px above bar top — almost touching.
    // S-curve spans 70px each side, dips 36px deep.
    // CP1 = same y as start (horizontal tangent leaving bar) — pulls 65% across
    // CP2 = same y as end   (horizontal tangent at valley)   — pulls 65% back
    // This gives a smooth, wide S on both sides symmetrically.

    // Pill y=-20, radius=28 → bottom of pill is 8px inside bar.
    // Notch depth = pill overlap + 7px gap = 8 + 7 = 15px... but we want visible curves.
    // Use depth=44 so the curve scoops generously around the pill bottom.
    const sp = 65;   // half-span
    const d  = 44;   // depth — deeper to wrap around the lower-sitting pill
    const t  = sp * 0.65;

    const nL = cx - sp;
    const nR = cx + sp;

    return [
      `M 0 0`,
      `L ${nL} 0`,
      `C ${nL + t} 0  ${cx - t} ${d}  ${cx} ${d}`,
      `C ${cx + t} ${d}  ${nR - t} 0  ${nR} 0`,
      `C ${nR + EAR_W * 0.3} ${-EAR_H}  ${nR + EAR_W * 0.7} ${-EAR_H}  ${nR + EAR_W} 0`,
      `L ${W} 0`,
      `L ${W} ${H}`,
      `L 0 ${H}`,
      `Z`,
    ].join(' ');
  }

  navigate(tab: TabDef) {
    this.router.navigate([tab.route]);
  }
}
