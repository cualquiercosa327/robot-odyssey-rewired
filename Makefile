#---------------------------------------------------------------------------------
.SUFFIXES:
#---------------------------------------------------------------------------------

ifeq ($(strip $(DEVKITARM)),)
$(error "Please set DEVKITARM in your environment. export DEVKITARM=<path to>devkitARM")
endif

include $(DEVKITARM)/ds_rules

#---------------------------------------------------------------------------------
# TARGET is the name of the output
# BUILD is the directory where object files & intermediate files will be placed
# SOURCES is a list of directories containing source code
# INCLUDES is a list of directories containing extra header files
#---------------------------------------------------------------------------------
TARGET          :=      $(shell basename $(CURDIR))
BUILD           :=      build
SOURCES         :=      source
SCRIPTS         :=      scripts
GBFSDIR         :=      data/fs
INCLUDES        :=      include

# List of object files to generate via binary translation
BT_OBJS         :=      lab.bt.o


#---------------------------------------------------------------------------------
# options for code generation
#---------------------------------------------------------------------------------
ARCH    :=      -mthumb -mthumb-interwork

# These optimization options are really important for compacting down
# the binary translated code.. especially -Os and -fweb! I usually use
# -frtl-abstract-sequences too, but it causes an internal compiler error...

CFLAGS  :=      -g -Wall -Os \
                -march=armv5te -mtune=arm946e-s -fomit-frame-pointer \
                -ffast-math -fweb \
                $(ARCH)

CFLAGS  +=      $(INCLUDE) -DARM9
CXXFLAGS        := $(CFLAGS) -fno-rtti -fno-exceptions

ASFLAGS :=      -g $(ARCH)
LDFLAGS =       -specs=ds_arm9.specs -g $(ARCH) -mno-fpu -Wl,-Map,$(notdir $*.map)

#---------------------------------------------------------------------------------
# any extra libraries we wish to link with the project
#---------------------------------------------------------------------------------
LIBS    := -lnds9


#---------------------------------------------------------------------------------
# list of directories containing libraries, this must be the top level containing
# include and lib
#---------------------------------------------------------------------------------
LIBDIRS :=      $(LIBNDS)

#---------------------------------------------------------------------------------
# no real need to edit anything past this point unless you need to add additional
# rules for different file extensions
#---------------------------------------------------------------------------------
ifneq ($(BUILD),$(notdir $(CURDIR)))
#---------------------------------------------------------------------------------

export TOPDIR   :=      $(CURDIR)

export OUTPUT   :=      $(TOPDIR)/$(TARGET)

export VPATH    :=      $(foreach dir,$(SOURCES),$(TOPDIR)/$(dir)) \
                        $(TOPDIR)/$(GBFSDIR)

export DEPSDIR  :=      $(TOPDIR)/$(BUILD)

CFILES          :=      $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
CPPFILES        :=      $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.cpp)))
SFILES          :=      $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.s)))

export GBFSFILES        := $(notdir $(wildcard $(GBFSDIR)/*.*))

#---------------------------------------------------------------------------------
# use CXX for linking C++ projects, CC for standard C
#---------------------------------------------------------------------------------
ifeq ($(strip $(CPPFILES)),)
#---------------------------------------------------------------------------------
        export LD       :=      $(CC)
#---------------------------------------------------------------------------------
else
#---------------------------------------------------------------------------------
        export LD       :=      $(CXX)
#---------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------


export OFILES   :=      data.gbfs.o $(BT_OBJS) \
                        $(CPPFILES:.cpp=.o) $(CFILES:.c=.o) $(SFILES:.s=.o)

export INCLUDE  :=      $(foreach dir,$(INCLUDES),-I$(TOPDIR)/$(dir)) \
                                        $(foreach dir,$(LIBDIRS),-I$(dir)/include) \
                                        $(foreach dir,$(LIBDIRS),-I$(dir)/include) \
                                        -I$(TOPDIR)/$(BUILD)

export LIBPATHS :=      $(foreach dir,$(LIBDIRS),-L$(dir)/lib)

.PHONY: $(BUILD) clean

#---------------------------------------------------------------------------------
$(BUILD):
	@[ -d $@ ] || mkdir -p $@
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(TOPDIR)/Makefile

#---------------------------------------------------------------------------------
clean:
	@echo clean ...
	@rm -fr $(BUILD) $(TARGET).elf $(TARGET).nds $(TARGET).arm9 $(TARGET).ds.gba 


#---------------------------------------------------------------------------------
else

DEPENDS :=      $(OFILES:.o=.d)

#---------------------------------------------------------------------------------
# main targets
#---------------------------------------------------------------------------------
$(OUTPUT).nds   :       $(OUTPUT).arm9
$(OUTPUT).arm9  :       $(OUTPUT).elf
$(OUTPUT).elf   :       $(OFILES)

#---------------------------------------------------------------------------------
%.gbfs.o : %.gbfs
	@$(bin2o)

#---------------------------------------------------------------------------------
%.gbfs :
	@cd $(TOPDIR)/$(GBFSDIR) && gbfs $(TOPDIR)/$(BUILD)/$@ $(GBFSFILES)

#---------------------------------------------------------------------------------
# Binary translation rules

%.bt.c: $(TOPDIR)/$(SCRIPTS)/bt_%.py $(TOPDIR)/$(SCRIPTS)/sbt86.py
	@cd $(TOPDIR)/$(SCRIPTS) && python $<

-include $(DEPENDS)

#---------------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------------
