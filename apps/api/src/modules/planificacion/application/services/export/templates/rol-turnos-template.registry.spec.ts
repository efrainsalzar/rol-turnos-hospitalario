import { RolTurnosTemplate2026 } from './rol-turnos-template-2026';
import { RolTurnosTemplateDefault } from './rol-turnos-template-default';
import { RolTurnosTemplateRegistry } from './rol-turnos-template.registry';

describe('RolTurnosTemplateRegistry', () => {
  it('selects template 2026 for year 2026', () => {
    const registry = new RolTurnosTemplateRegistry(
      new RolTurnosTemplate2026(),
      new RolTurnosTemplateDefault(),
    );

    expect(registry.resolve(2026)).toBeInstanceOf(RolTurnosTemplate2026);
  });

  it('falls back to default for unsupported years', () => {
    const registry = new RolTurnosTemplateRegistry(
      new RolTurnosTemplate2026(),
      new RolTurnosTemplateDefault(),
    );

    expect(registry.resolve(2027)).toBeInstanceOf(RolTurnosTemplateDefault);
  });
});
