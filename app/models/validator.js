import DS from 'ember-data';
import { buildValidations, validator } from 'ember-cp-validations';

const Validations = buildValidations({
    nameInput: validator('presence',true),
    passwordInput: validator('presence',true),
    dropdown: validator('presence',true)
});

export default DS.Model.extend(
    Validations, {
        nameInput: DS.attr('string'),
        passwordInput:DS.attr('string'),
        dropdown:DS.attr('string')
});