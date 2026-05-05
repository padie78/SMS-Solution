import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-echarts-native-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<div #host class="echarts-native-pane__host w-full" [style.height.px]="hostHeightPx"></div>',
  styleUrl: './echarts-native-pane.component.scss'
})
export class EchartsNativePaneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) options!: EChartsOption;

  /** Altura fija del canvas (evita 0px en padres flex sin height). */
  @Input() hostHeightPx = 300;

  private chart: ReturnType<typeof echarts.init> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      const el = this.hostRef.nativeElement;
      this.chart = echarts.init(el, undefined, { renderer: 'canvas' });
      this.chart.setOption(this.options, { notMerge: true });
      this.resizeObserver = new ResizeObserver(() => {
        this.chart?.resize();
      });
      this.resizeObserver.observe(el);
      requestAnimationFrame(() => {
        this.chart?.resize();
        requestAnimationFrame(() => this.chart?.resize());
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.chart) {
      this.ngZone.runOutsideAngular(() => {
        this.chart?.setOption(this.options, { notMerge: true });
        this.chart?.resize();
      });
    }
    if (changes['hostHeightPx'] && this.chart) {
      this.ngZone.runOutsideAngular(() => this.chart?.resize());
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.chart?.dispose();
    this.chart = null;
  }
}
