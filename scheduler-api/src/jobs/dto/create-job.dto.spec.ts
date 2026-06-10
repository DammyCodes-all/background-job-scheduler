import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobDto } from './create-job.dto';

describe('CreateJobDto', () => {
  it('maps dependency_ids to dependencyIds', async () => {
    const dependencyId = '123e4567-e89b-12d3-a456-426614174000';

    const dto = plainToInstance(CreateJobDto, {
      type: 'send_email',
      dependency_ids: [dependencyId],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.dependencyIds).toEqual([dependencyId]);
  });
});
