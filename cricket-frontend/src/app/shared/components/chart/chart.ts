// import {
//   AfterViewInit,
//   Component,
//   ElementRef,
//   OnChanges,
//   OnDestroy,
//   SimpleChanges,
//   ViewChild,
//   input,
// } from '@angular/core';
// import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Chart.register(...registerables);

// /**
//  * Thin Angular wrapper around Chart.js. Re-creates the chart whenever
//  * `data`/`type`/`options` change (simplest correct approach for a dashboard
//  * where chart inputs change infrequently — a full update-in-place diff isn't
//  * worth the complexity here).
//  */
// @Component({
//   selector: 'app-chart',
//   imports: [],
//   template: `<div class="chart-wrap" [style.height.px]="height()">
//     <canvas #canvas></canvas>
//   </div>`,
//   styles: [
//     `
//       .chart-wrap {
//         position: relative;
//         width: 100%;
//       }
//       canvas {
//         max-width: 100%;
//       }
//     `,
//   ],
// })
// export class AppChart implements AfterViewInit, OnChanges, OnDestroy {
//   @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

//   type = input.required<ChartType>();
//   data = input.required<ChartConfiguration['data']>();
//   options = input<ChartConfiguration['options']>();
//   height = input<number>(280);

//   private chart: Chart | null = null;

//   ngAfterViewInit(): void {
//     this.renderChart();
//   }

//   ngOnChanges(changes: SimpleChanges): void {
//     if ((changes['data'] || changes['type'] || changes['options']) && this.canvasRef) {
//       this.renderChart();
//     }
//   }

//   ngOnDestroy(): void {
//     this.chart?.destroy();
//   }

//   private renderChart(): void {
//     this.chart?.destroy();

//     const styles = getComputedStyle(document.documentElement);
//     const textSecondary = styles.getPropertyValue('--color-text-secondary').trim();
//     const border = styles.getPropertyValue('--color-border').trim();

//     this.chart = new Chart(this.canvasRef.nativeElement, {
//       type: this.type(),
//       data: this.data(),
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//           legend: {
//             labels: { color: textSecondary, font: { family: 'Inter' } },
//           },
//         },
//         scales: this.type() === 'doughnut' || this.type() === 'pie'
//           ? undefined
//           : {
//               x: {
//                 ticks: { color: textSecondary },
//                 grid: { color: border },
//               },
//               y: {
//                 ticks: { color: textSecondary },
//                 grid: { color: border },
//               },
//             },
//         ...this.options(),
//       },
//     });
//   }
// }




import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  input,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * Thin Angular wrapper around Chart.js. Re-creates the chart whenever
 * `data`/`type`/`options` change (simplest correct approach for a dashboard
 * where chart inputs change infrequently — a full update-in-place diff isn't
 * worth the complexity here).
 *
 * Bar/line charts with many categories (e.g. "Top wicket takers" across a
 * whole tournament's players) get squeezed into whatever width the card
 * has on a phone, which forces Chart.js to rotate + shrink + eventually
 * clip axis labels. Rather than let labels overlap or get cut off, the
 * canvas gets a minimum width based on how many categories there are, and
 * the outer wrapper scrolls horizontally — same pattern as our data
 * tables — so every bar and its full label is always reachable.
 */
@Component({
  selector: 'app-chart',
  imports: [],
  template: `
    <div class="chart-scroll">
      <div class="chart-wrap" [style.height.px]="height()" [style.min-width.px]="minWidth()">
        <canvas #canvas></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .chart-scroll {
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
      }
      .chart-wrap {
        position: relative;
        width: 100%;
      }
      canvas {
        max-width: 100%;
      }
    `,
  ],
})
export class AppChart implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  type = input.required<ChartType>();
  data = input.required<ChartConfiguration['data']>();
  options = input<ChartConfiguration['options']>();
  height = input<number>(280);

  minWidth = computed(() => {
    const categoryCount = this.data().labels?.length ?? 0;
    if (this.type() === 'pie' || this.type() === 'doughnut' || categoryCount === 0) return 0;
    return Math.max(320, categoryCount * 42);
  });

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['type'] || changes['options']) && this.canvasRef) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    this.chart?.destroy();

    const styles = getComputedStyle(document.documentElement);
    const textSecondary = styles.getPropertyValue('--color-text-secondary').trim();
    const border = styles.getPropertyValue('--color-border').trim();

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: this.type(),
      data: this.data(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textSecondary, font: { family: 'Inter' } },
          },
        },
        scales: this.type() === 'doughnut' || this.type() === 'pie'
          ? undefined
          : {
              x: {
                ticks: { color: textSecondary },
                grid: { color: border },
              },
              y: {
                ticks: { color: textSecondary },
                grid: { color: border },
              },
            },
        ...this.options(),
      },
    });
  }
}