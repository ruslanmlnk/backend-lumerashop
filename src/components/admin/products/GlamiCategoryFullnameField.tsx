'use client'

import { SelectInput, useField } from '@payloadcms/ui'
import type { OptionObject, TextFieldClientComponent } from 'payload'

import glamiCategoryFullnames from '@/data/glami-category-fullnames.json'

const options: OptionObject[] = glamiCategoryFullnames.map((fullname) => ({
  label: fullname,
  value: fullname,
}))
const categoryFullnameSet = new Set(glamiCategoryFullnames)

const validateSelectedCategory = (value: unknown) => {
  if (value == null || value === '') {
    return true
  }

  return typeof value === 'string' && categoryFullnameSet.has(value)
    ? true
    : 'Vyberte platnou kategorii z oficiálního seznamu GLAMI.'
}

const GlamiCategoryFullnameField: TextFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const {
    customComponents: { AfterInput, BeforeInput, Description, Error, Label } = {},
    disabled,
    path,
    setValue,
    showError,
    value,
  } = useField<string | null>({
    potentiallyStalePath: pathFromProps,
    validate: validateSelectedCategory,
  })

  return (
    <SelectInput
      AfterInput={AfterInput}
      BeforeInput={BeforeInput}
      className={field.admin?.className}
      Description={Description}
      description={field.admin?.description}
      Error={Error}
      isClearable
      Label={Label}
      label={field.label || undefined}
      localized={field.localized}
      name={field.name}
      onChange={(selected) => {
        const option = Array.isArray(selected) ? selected[0] : selected

        setValue(typeof option?.value === 'string' ? option.value : null)
      }}
      options={options}
      path={path}
      placeholder={
        typeof field.admin?.placeholder === 'string'
          ? field.admin.placeholder
          : 'Začněte psát kategorii GLAMI…'
      }
      readOnly={Boolean(readOnly || disabled)}
      required={field.required}
      showError={showError}
      style={field.admin?.style}
      value={typeof value === 'string' ? value : undefined}
    />
  )
}

export default GlamiCategoryFullnameField
