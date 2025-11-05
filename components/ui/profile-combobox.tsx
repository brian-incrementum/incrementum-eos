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
import type { Tables } from '@/lib/types/database.types'

type Profile = Tables<'profiles'>

interface ProfileComboboxProps {
  profiles: Profile[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  excludeIds?: string[] // Optional: profiles to exclude from the list
}

export function ProfileCombobox({
  profiles,
  value,
  onValueChange,
  placeholder = 'Select person...',
  emptyText = 'No person found.',
  excludeIds = [],
}: ProfileComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Filter out excluded profiles
  const filteredProfiles = profiles.filter(
    (profile) => !excludeIds.includes(profile.id)
  )

  // Find profile by id
  const selectedProfile = filteredProfiles.find((profile) => profile.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProfile
            ? selectedProfile.full_name || selectedProfile.email
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredProfiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.full_name || profile.email || profile.id}
                  onSelect={() => {
                    onValueChange(profile.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      profile.id === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {profile.full_name || profile.email}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
