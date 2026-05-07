import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TabsPageRoutingModule } from './tabs-routing.module';
import { TabsPage } from './tabs.page';
import { AnimatedTabBarComponent } from '../components/animated-tab-bar/animated-tab-bar.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule,
    TabsPageRoutingModule,
  ],
  declarations: [TabsPage, AnimatedTabBarComponent],
})
export class TabsPageModule {}
