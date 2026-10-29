import { registerDecorator, ValidationOptions } from 'class-validator';

import { noVacio } from './codigo-visual-etiqueta';

// Complementa @IsString(): rechaza "" y cadenas de solo espacios, algo que
// class-validator no cubre por si solo (@IsNotEmpty tampoco hace trim).
export function EsNoVacio(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esNoVacio',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return noVacio(value);
        },
        defaultMessage() {
          return `${propertyName} no puede estar vacio`;
        },
      },
    });
  };
}
