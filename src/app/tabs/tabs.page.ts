import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { UserRole } from '../models/user.model';

// Each shoulder is TWO bezier segments:
//  1. Shoulder arch: horizontal start → arches ABOVE bar top (convex) → vertical end
//  2. Notch descent: vertical start → quarter-ellipse down to notch centre (concave)
// The sign change in curvature between the two segments is what creates the S-curve.

const BAR_H  = 70;
const ARCH   = 18;            // path extends this far above bar top
const HALF_W = 44;            // half-width of notch (shoulder arc entry offset from cx)
const D      = 26;            // notch depth below bar top
const SW     = 52;            // shoulder horizontal span
const Cx     = HALF_W * 0.552; // quarter-ellipse bezier offset

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {
  activeTab = 'tab1';
  clipPath  = '';
  barW      = window.innerWidth;

  private routerSub!: Subscription;

  constructor(
    public authSvc: FirebaseAuthService,
    private router: Router,
  ) {}

  get isSuperAdmin(): boolean {
    return this.authSvc.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  private get tabCount(): number {
    return this.isSuperAdmin ? 4 : 3;
  }

  ngOnInit() {
    this.barW = window.innerWidth || 390;
    this.updateActive(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateActive(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize() {
    this.barW = window.innerWidth;
    this.buildClipPath();
  }

  private updateActive(url: string) {
    if (url.includes('/tab4'))      this.activeTab = 'tab4';
    else if (url.includes('/tab3')) this.activeTab = 'tab3';
    else if (url.includes('/tab2')) this.activeTab = 'tab2';
    else                            this.activeTab = 'tab1';
    this.buildClipPath();
  }

  private activeIndex(): number {
    if (this.isSuperAdmin) {
      const map: Record<string, number> = { tab1: 0, tab2: 1, tab4: 2, tab3: 3 };
      return map[this.activeTab] ?? 0;
    }
    const map: Record<string, number> = { tab1: 0, tab2: 1, tab3: 2 };
    return map[this.activeTab] ?? 0;
  }

  private buildClipPath() {
    const W  = this.barW;
    const tw = W / this.tabCount;
    const cx = tw * this.activeIndex() + tw / 2;

    const BT  = ARCH;            // bar top y in path coords
    const BB  = ARCH + BAR_H;    // bar bottom y in path coords
    const cpX = SW * 0.55;       // shoulder CP1 x-offset for gradual S entry

    // Left shoulder arch (segment 1): horizontal → arches above BT → vertical down
    //   C1 same y as start → horizontal tangent
    //   C2 at y=0 → pulls curve above bar top
    //   end at (cx-HALF_W, BT) with downward tangent
    //
    // Left notch descent (segment 2): vertical down → quarter-ellipse → horizontal
    //   C1 straight down from entry → C2 horizontal at notch bottom
    //
    // Right side mirrors left.
    const d = [
      `M 0 ${BT}`,
      `L ${cx - HALF_W - SW} ${BT}`,
      `C ${cx - HALF_W - SW + cpX} ${BT} ${cx - HALF_W} 0 ${cx - HALF_W} ${BT}`,
      `C ${cx - HALF_W} ${BT + D} ${cx - Cx} ${BT + D} ${cx} ${BT + D}`,
      `C ${cx + Cx} ${BT + D} ${cx + HALF_W} ${BT + D} ${cx + HALF_W} ${BT}`,
      `C ${cx + HALF_W} 0 ${cx + HALF_W + SW - cpX} ${BT} ${cx + HALF_W + SW} ${BT}`,
      `L ${W} ${BT}`,
      `L ${W} ${BB}`,
      `L 0 ${BB}`,
      `Z`,
    ].join(' ');

    this.clipPath = `path('${d}')`;
  }
}
