export class SalesProgressResponseDto {
  xAxis: string[]; // Date labels for x-axis
  yAxis: string[]; // Value labels for y-axis
  data: number[]; // Sales data points

  constructor(xAxis: string[], yAxis: string[], data: number[]) {
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.data = data;
  }
}
