import pandas as pd
import json
import glob
import preprocessor

# Save the config with the current values
def saveConfig():
  with open('./machinelearning/preprocessor.json', 'w') as file:
    json.dump({
    "srcPath": srcPath,
    "preprocessedPath": preprocessedPath,
    "dropFeatures": dropFeatures,
    "pad": pad,
    "getCSVStats": getCSVStats,
    "minLen": minLen,
    "maxLen": maxLen,
    "outPathsCount": outPathsCount
  },file, indent=4)
  print('Changes Saved.\n')

# Handles user toggling boolean values
def toggleBool(prompt, val):
  exit = False
  while not exit:
    print('%s%s\n'
          '[t]Toggle\n'
          '[d]Done\n'%(prompt,val))
    option = input()
    if(option=='t'):
      val = not val
    elif(option=='d'):
      exit = True
    else:
      print('Bad input')
  return val

# Handles user editing integer values
def setNum(prompt, val):
  exit = False
  while not exit:
    print('%s%d\n'
          'Enter new integer:\n'
          '[x] to cancel'%(prompt,val))
    option = input()
    if(option=='x'):
      exit = True
    else:
      try:
        val = int(option)
        exit = True
      except:
        print('Bad input.')
  return val

# Handles editing the dropFeatures
def editFeatures():
  exit = False
  file = glob.glob('%s/*.csv' %srcPath)[0]
  allheaders = pd.read_csv(file, index_col=False,nrows=0).columns.tolist()
  while not exit:
    for index, header in enumerate(allheaders):
      status = 'ignored' if header in dropFeatures else 'included'
      print('[%d]%s (%s)'%(index,header,status))
    print('[d]Done')
    option = input()
    if option=='d':
      saveConfig()
      exit = True
    else:
      try:
        selVal = allheaders[int(option)]
        print('Selected: %s\n'
              '[1]Toggle\n'
              '[2]Cancel\n'%selVal)
        option = input()
        if(option=='1'):
          if selVal in dropFeatures:
            dropFeatures.remove(selVal)
          else:
            dropFeatures.append(selVal)
        elif(option=='2'):
          print('Action Canceled')
        else:
          print('Bad input\n')
      except:
        print('Bad input.\n')

### START ###

# String to display with help info
strHelp=('\nData:\n'
        'Source Path: \t\t\tPath to the data that the preprocessor will process. A folder with CSV files.\n'
        'Destination Path: \t\tPath that the preprocessor will save data to after processing. Saved as JSON files.\n'
        '\nEdit setting?\n'
        '[1]Features to ignore: \t\tFeatures of the CSVs that will be left out of the processed data.\n'
        '[2]Pad data?: \t\t\tIf set to true, preprocessor will extend all paths to Max Path Length.\n'
        '[3]Get CSV Stats?: \t\tIf set to true, the preprocesor will output extra information about the CSVs.\n'
        '[4]Minimum Path Length: \tThe shortest acceptable path length to include in output.\n'
        '[5]Maximum Path Length: \tThe longest acceptable path length to include in output.\n'
        '[6]Output Path Count per CSV: \tThe maximum number of paths to take from each CSV.\n'
        '\nOptions:\n'
        '[r]Run preprocessor with current settings \tRuns the preprocesser.\n'
        '[h]Help \tShows the help information.\n'
        '[x]Exit \tExits the program.')

#Load defaults
with open('./machinelearning/preprocessor.json', 'r') as f:
  data = json.load(f)
srcPath = data['srcPath']
preprocessedPath = data['preprocessedPath']
dropFeatures = data['dropFeatures']
pad = data['pad']
getCSVStats = data['getCSVStats']
minLen = data['minLen']
maxLen = data['maxLen']
outPathsCount = data['outPathsCount']

# Set up preprocesser command line
exit = False
while not exit:
  #Print current settings
  print('\nData:\n'
        'Source Path: \t\t\t%s\n'
        'Destination Path: \t\t%s\n'
        '\nEdit setting?\n'
        '[1]Features to ignore: \t\t%s\n'
        '[2]Pad data?: \t\t\t%s\n'
        '[3]Get CSV Stats?: \t\t%s\n'
        '[4]Minimum Path Length: \t%d\n'
        '[5]Maximum Path Length: \t%d\n'
        '[6]Output Path Count per CSV: \t%d\n'
        '\nOptions:\n'
        '[r]Run preprocessor with current settings\n'
        '[h]Help\n'
        '[x]Exit'%(srcPath,preprocessedPath,dropFeatures,pad,getCSVStats,minLen,maxLen,outPathsCount))
  option = input()
  # Act on input
  if(option=='r'):
    print('Running with saved options...')
    preprocessor.run()
  elif(option=='h'):
    print(strHelp)
    input('Hit enter to to continue...')
  elif(option=='x'):
    print('Exiting...')
    exit = True
  elif(option=='1'):
    print('Edit features:\n')
    editFeatures()
  elif(option=='2'):
    pad = toggleBool('Pad Data?:\t',pad)
    saveConfig()
  elif(option=='3'):
    getCSVStats = toggleBool('Get CSV Stats?:\t',getCSVStats)
    saveConfig()
  elif(option=='4'):
    minLen = setNum('Minimum Path Length:\t', minLen)
    saveConfig()
  elif(option=='5'):
    maxLen = setNum('Maximum Path Length:\t', maxLen)
    saveConfig()
  elif(option=='6'):
    outPathsCount = setNum('Output Path Count per CSV:\t', outPathsCount)
    saveConfig()
  else:
    #error
    print('invalid input\n')