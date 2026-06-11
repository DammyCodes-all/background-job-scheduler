import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto } from './jobs/dto/health-response.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root endpoint', description: 'Returns a simple greeting to confirm the server is running.' })
  @ApiResponse({ status: 200, description: 'Greeting message.', schema: { example: 'Hello World!' } })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns the service status and database connectivity. Runs SELECT 1 to verify the DB connection. Suitable for load balancer and container orchestration liveness probes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check result.',
    type: HealthResponseDto,
  })
  health() {
    return this.appService.health();
  }
}
