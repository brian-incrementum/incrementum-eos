'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { EmployeeWithProfile } from '@/lib/actions/employees'

interface EmployeeComboboxProps {
  employees: EmployeeWithProfile[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
}

export function EmployeeCombobox({
  employees,
  value,
  onValueChange,
  placeholder = 'Select employee...',
  emptyText = 'No employee found.',
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Find employee by profile_id
  const selectedEmployee = employees.find((employee) => employee.profile_id === value)
  const getDisplayName = (employee: EmployeeWithProfile) =>
    employee.full_name || employee.profile.full_name || 'Unknown'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedEmployee ? getDisplayName(selectedEmployee) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employee..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="unassigned"
                value="unassigned"
                onSelect={() => {
                  onValueChange('')
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === '' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Unassigned
              </CommandItem>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={getDisplayName(employee)}
                  onSelect={() => {
                    // Store profile_id as the value
                    onValueChange(employee.profile_id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      employee.profile_id === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {getDisplayName(employee)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
